/**
 * Media search for beats that call for a photo/video. Only freely licensed sources are downloaded:
 *   library  – projects/_library (file name contains a search word)
 *   commons  – Wikimedia Commons (photos, CC0 / CC BY / CC BY-SA / public domain), no key needed
 *   pexels   – photos + videos, needs PEXELS_API_KEY
 *   pixabay  – photos + videos, needs PIXABAY_API_KEY
 *   openverse – photos from many CC collections (Flickr, museums …; Wikimedia is covered by `commons`), no key needed
 *   unsplash – photos, needs UNSPLASH_ACCESS_KEY
 *   nasa     – photos + videos from the NASA Image and Video Library (public domain), no key needed
 *   coverr   – videos, needs COVERR_API_KEY (demo keys: credit Coverr + creator)
 * Audio (`npm run sounds`):
 *   freesound – sound effects (CC0 / CC BY only), needs FREESOUND_API_KEY
 *   openverse – sound effects + music (Jamendo, Freesound, Wikimedia, ccMixter …), commercial-use licenses only, no key needed
 *   coverr   – royalty-free music, needs COVERR_API_KEY
 * Press photos and third-party YouTube clips are NOT downloaded (rights): `searchLinks()` returns
 * ready-made search links instead, and a human downloads manually into work/assets/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { env } from './env';
import { probe, run } from './exec';
import { AUDIO_EXT, BRAND, IMAGE_EXT, LIBRARY, VIDEO_EXT, ensureDir, listFiles, writeJson } from './paths';
import type { Candidate } from '../schemas/visuals';

export type Provider = 'library' | 'commons' | 'openverse' | 'nasa' | 'pexels' | 'pixabay' | 'unsplash' | 'coverr';
export type AudioProvider = 'library' | 'freesound' | 'openverse' | 'coverr';
export type Hit = Omit<Candidate, 'file'> & { downloadUrl: string; ext: string; /** pinged after the download (Unsplash API guideline) */ trackUrl?: string };

const UA = 'video-asset-fetcher/0.1';
const MIN_PHOTO_WIDTH = 1600;
/** Photos between this and MIN_PHOTO_WIDTH are kept as `small` candidates (→ npm run upscale) */
const MIN_SMALL_WIDTH = 800;
const MIN_VIDEO_WIDTH = 1280;
// "gemeinfrei" = German for public domain (Commons license labels can be localized)
// CC BY and CC BY-SA only – the NC (non-commercial) and ND (no derivatives) variants don't fit a monetized, edited video
const FREE_LICENSE = /^(cc0|cc[ -]by(?:[ -]sa)?(?![ -]?(?:nc|nd))\b|public domain|pd\b|gemeinfrei)/i;

export function availableProviders(): Provider[] {
  const out: Provider[] = ['library', 'commons', 'openverse', 'nasa'];
  if (env('PEXELS_API_KEY')) out.push('pexels');
  if (env('PIXABAY_API_KEY')) out.push('pixabay');
  if (env('UNSPLASH_ACCESS_KEY')) out.push('unsplash');
  if (env('COVERR_API_KEY')) out.push('coverr');
  return out;
}

export function availableAudioProviders(): AudioProvider[] {
  const out: AudioProvider[] = ['library', 'openverse'];
  if (env('FREESOUND_API_KEY')) out.push('freesound');
  if (env('COVERR_API_KEY')) out.push('coverr');
  return out;
}

async function getJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers } });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return res.json();
}

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

export async function searchCommons(query: string, limit = 10): Promise<Hit[]> {
  const url =
    'https://commons.wikimedia.org/w/api.php?' +
    new URLSearchParams({
      action: 'query',
      format: 'json',
      generator: 'search',
      gsrsearch: `${query} filetype:bitmap`,
      gsrnamespace: '6',
      gsrlimit: String(limit),
      prop: 'imageinfo',
      iiprop: 'url|size|mime|extmetadata',
      iiurlwidth: '2400',
    });
  const data = await getJson(url);
  const pages = Object.values<any>(data.query?.pages ?? {});
  const hits: Hit[] = [];
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii || !/^image\/(jpeg|png|webp)$/.test(ii.mime)) continue;
    const meta = ii.extmetadata ?? {};
    const license = stripHtml(meta.LicenseShortName?.value ?? '');
    if (!FREE_LICENSE.test(license)) continue;
    if ((ii.width ?? 0) < MIN_PHOTO_WIDTH) continue;
    const artist = stripHtml(meta.Artist?.value ?? '') || 'unknown';
    hits.push({
      provider: 'commons',
      url: ii.descriptionurl,
      license,
      credit: `Photo: ${artist} / ${license} (Wikimedia Commons)`,
      width: ii.width,
      height: ii.height,
      kind: 'image',
      downloadUrl: ii.thumburl ?? ii.url,
      ext: ii.mime === 'image/png' ? '.png' : ii.mime === 'image/webp' ? '.webp' : '.jpg',
    });
  }
  return hits;
}

export async function searchPexels(query: string, kind: 'image' | 'video', limit = 8): Promise<Hit[]> {
  const key = env('PEXELS_API_KEY');
  if (!key) return [];
  const base = kind === 'video' ? 'https://api.pexels.com/videos/search' : 'https://api.pexels.com/v1/search';
  const data = await getJson(`${base}?${new URLSearchParams({ query, per_page: String(limit), orientation: 'landscape' })}`, { Authorization: key });
  if (kind === 'image') {
    return (data.photos ?? [])
      .filter((p: any) => p.width >= MIN_PHOTO_WIDTH)
      .map((p: any): Hit => ({
        provider: 'pexels', url: p.url, license: 'Pexels License', credit: `Photo: ${p.photographer} / Pexels`,
        width: p.width, height: p.height, kind: 'image', downloadUrl: p.src.large2x ?? p.src.original, ext: '.jpg',
      }));
  }
  return (data.videos ?? []).flatMap((v: any): Hit[] => {
    const f = [...(v.video_files ?? [])]
      .filter((x: any) => x.file_type === 'video/mp4' && x.width >= 1920 && x.width <= 3840)
      .sort((a: any, b: any) => a.width - b.width)[0];
    return f
      ? [{ provider: 'pexels', url: v.url, license: 'Pexels License', credit: `Video: ${v.user?.name ?? 'unknown'} / Pexels`, width: f.width, height: f.height, kind: 'video', downloadUrl: f.link, ext: '.mp4' }]
      : [];
  });
}

export async function searchPixabay(query: string, kind: 'image' | 'video', limit = 8): Promise<Hit[]> {
  const key = env('PIXABAY_API_KEY');
  if (!key) return [];
  const base = kind === 'video' ? 'https://pixabay.com/api/videos/' : 'https://pixabay.com/api/';
  const data = await getJson(`${base}?${new URLSearchParams({ key, q: query, per_page: String(Math.max(3, limit)), ...(kind === 'image' ? { image_type: 'photo', orientation: 'horizontal' } : {}) })}`);
  return (data.hits ?? []).flatMap((h: any): Hit[] => {
    if (kind === 'image') {
      if ((h.imageWidth ?? 0) < MIN_PHOTO_WIDTH) return [];
      return [{ provider: 'pixabay', url: h.pageURL, license: 'Pixabay Content License', credit: `Photo: ${h.user} / Pixabay`, width: h.imageWidth, height: h.imageHeight, kind: 'image', downloadUrl: h.largeImageURL, ext: '.jpg' }];
    }
    const v = h.videos?.large?.url ? h.videos.large : h.videos?.medium;
    return v?.url
      ? [{ provider: 'pixabay', url: h.pageURL, license: 'Pixabay Content License', credit: `Video: ${h.user} / Pixabay`, width: v.width, height: v.height, kind: 'video', downloadUrl: v.url, ext: '.mp4' }]
      : [];
  });
}

/** Openverse licenses that allow commercial use AND modification (crop, Ken Burns, trimming). */
const OPENVERSE_LICENSES = 'cc0,pdm,by,by-sa';
/** wikimedia: covered by `commons`; rawpixel/stocksnap: only small previews (~1000 px); sketchfab: 3D renders */
const OPENVERSE_SKIP_IMAGE_SOURCES = 'wikimedia,rawpixel,stocksnap,sketchfab';
const ovLicense = (r: any) => (r.license === 'cc0' || r.license === 'pdm' ? r.license.toUpperCase() : `CC ${String(r.license).toUpperCase()} ${r.license_version ?? ''}`.trim());

export async function searchOpenverse(query: string, limit = 10): Promise<Hit[]> {
  const data = await getJson(
    `https://api.openverse.org/v1/images/?${new URLSearchParams({ q: query, license: OPENVERSE_LICENSES, aspect_ratio: 'wide', size: 'large', mature: 'false', excluded_source: OPENVERSE_SKIP_IMAGE_SOURCES, page_size: String(Math.min(20, limit)) })}`,
  );
  return (data.results ?? [])
    .filter((r: any) => (r.width ?? 0) >= MIN_PHOTO_WIDTH && /^(jpe?g|png|webp)$/i.test(r.filetype ?? 'jpg'))
    .map((r: any): Hit => ({
      provider: 'openverse', url: r.foreign_landing_url ?? r.url, license: ovLicense(r),
      credit: `Photo: ${r.creator || 'unknown'} / ${ovLicense(r)} (${r.source ?? r.provider ?? 'Openverse'})`,
      width: r.width, height: r.height, kind: 'image', downloadUrl: r.url,
      ext: /png/i.test(r.filetype ?? '') ? '.png' : /webp/i.test(r.filetype ?? '') ? '.webp' : '.jpg',
    }));
}

export async function searchUnsplash(query: string, limit = 8): Promise<Hit[]> {
  const key = env('UNSPLASH_ACCESS_KEY');
  if (!key) return [];
  const data = await getJson(`https://api.unsplash.com/search/photos?${new URLSearchParams({ query, per_page: String(limit), orientation: 'landscape', content_filter: 'high' })}`, {
    Authorization: `Client-ID ${key}`,
    'Accept-Version': 'v1',
  });
  return (data.results ?? [])
    .filter((p: any) => p.width >= MIN_PHOTO_WIDTH)
    .map((p: any): Hit => ({
      provider: 'unsplash', url: p.links?.html ?? '', license: 'Unsplash License', credit: `Photo: ${p.user?.name ?? 'unknown'} / Unsplash`,
      width: p.width, height: p.height, kind: 'image', downloadUrl: `${p.urls.raw}&w=2400&fm=jpg&q=85`, ext: '.jpg',
      // API guideline: report every download to the download_location endpoint
      trackUrl: p.links?.download_location,
    }));
}

/**
 * NASA Image and Video Library (images-api.nasa.gov): public domain, no key. NASA logos/insignia and
 * recognizable people are NOT free for promotional use. Each hit points to a collection.json with all renditions.
 */
export async function searchNasa(query: string, kind: 'image' | 'video', limit = 6): Promise<Hit[]> {
  const data = await getJson(`https://images-api.nasa.gov/search?${new URLSearchParams({ q: query, media_type: kind, page_size: String(limit * 2) })}`);
  const items = (data.collection?.items ?? []).slice(0, limit * 2);
  const hits = await Promise.all(
    items.map(async (it: any): Promise<Hit | null> => {
      const d = it.data?.[0] ?? {};
      try {
        const files: string[] = (await getJson(it.href)).map((u: string) => u.replace(/^http:\/\//, 'https://'));
        const pick = (suffixes: string[]) => suffixes.map((sfx) => files.find((f) => f.endsWith(sfx))).find(Boolean);
        const file = kind === 'video' ? pick(['~orig.mp4', '~large.mp4', '~medium.mp4']) : pick(['~orig.jpg', '~large.jpg', '~orig.png']);
        if (!file) return null;
        return {
          provider: 'nasa', url: `https://images.nasa.gov/details/${encodeURIComponent(d.nasa_id)}`, license: 'Public domain (NASA)',
          credit: `${kind === 'video' ? 'Video' : 'Photo'}: NASA${d.center ? `/${d.center}` : ''}`,
          kind, downloadUrl: file, ext: path.extname(file).toLowerCase(),
        };
      } catch {
        return null;
      }
    }),
  );
  return hits.filter((h): h is Hit => h !== null).slice(0, limit);
}

/** Coverr (api.coverr.co): free stock videos. Demo API keys require a credit for Coverr and the creator. */
export async function searchCoverr(query: string, limit = 8): Promise<Hit[]> {
  const key = env('COVERR_API_KEY');
  if (!key) return [];
  const data = await getJson(`https://api.coverr.co/videos?${new URLSearchParams({ query, page_size: String(limit), urls: 'true', sort: 'popular' })}`, { 'x-api-key': key });
  const list: any[] = data.hits ?? data.videos ?? data.data ?? (Array.isArray(data) ? data : []);
  return list
    .filter((v) => !v.is_vertical && (v.max_width ?? 1920) >= 1920 && (v.urls?.mp4_download || v.urls?.mp4))
    .map((v): Hit => ({
      provider: 'coverr', url: `https://coverr.co/videos/${v.slug ?? v.id}`, license: 'Coverr License',
      credit: `Video: ${v.author?.name ?? v.creator?.name ?? v.user?.name ?? 'Coverr'} / Coverr`,
      width: v.max_width, height: v.max_height, kind: 'video', downloadUrl: v.urls.mp4_download ?? v.urls.mp4, ext: '.mp4',
      trackUrl: `https://api.coverr.co/videos/${v.id}/stats/downloads`,
    }));
}

// ── Audio ──────────────────────────────────────────────────────────────────────────────

export type AudioKind = 'sfx' | 'music';
export type AudioHit = {
  provider: AudioProvider;
  url: string;
  license: string;
  credit: string;
  title: string;
  duration?: number;
  downloadUrl: string;
  ext: string;
  localAbs?: string;
};

/** Duration window per kind, in seconds */
const AUDIO_LEN: Record<AudioKind, [number, number]> = { sfx: [0.3, 30], music: [30, 900] };

/** Freesound: sound effects. Only CC0 and CC BY (no NonCommercial, no Sampling+). Downloads the HQ preview (MP3 ~128 kbps). */
export async function searchFreesound(query: string, kind: AudioKind, limit = 8): Promise<AudioHit[]> {
  const key = env('FREESOUND_API_KEY');
  if (!key) return [];
  const [min, max] = AUDIO_LEN[kind];
  const data = await getJson(
    `https://freesound.org/apiv2/search/?${new URLSearchParams({
      query,
      filter: `license:("Creative Commons 0" OR "Attribution") duration:[${min} TO ${max}]`,
      fields: 'id,name,username,license,duration,previews,url',
      sort: 'score',
      page_size: String(limit),
    })}`,
    { Authorization: `Token ${key}` },
  );
  return (data.results ?? [])
    .filter((r: any) => !/by-nc|sampling/i.test(r.license ?? '') && r.previews?.['preview-hq-mp3'])
    .map((r: any): AudioHit => {
      const license = /publicdomain\/zero|cc0/i.test(r.license) ? 'CC0' : `CC BY ${/\/(\d\.\d)\//.exec(r.license)?.[1] ?? ''}`.trim();
      return {
        provider: 'freesound', url: r.url, license, title: r.name, duration: r.duration,
        credit: `Sound: "${r.name}" by ${r.username} / ${license} (Freesound)`,
        downloadUrl: r.previews['preview-hq-mp3'], ext: '.mp3',
      };
    });
}

/** Openverse audio: sound effects and music from Jamendo, Freesound, Wikimedia Commons, ccMixter … */
export async function searchOpenverseAudio(query: string, kind: AudioKind, limit = 10): Promise<AudioHit[]> {
  const [min, max] = AUDIO_LEN[kind];
  const data = await getJson(
    `https://api.openverse.org/v1/audio/?${new URLSearchParams({ q: query, license: OPENVERSE_LICENSES, mature: 'false', page_size: '20' })}`,
  );
  // `category` is empty for most sources, so the kind is told apart by duration only
  const hits = (data.results ?? []).flatMap((r: any): AudioHit[] => {
    const sec = typeof r.duration === 'number' ? r.duration / 1000 : undefined;
    if (sec !== undefined && (sec < min || sec > max)) return [];
    const ext = `.${String(r.filetype ?? path.extname(new URL(r.url).pathname).slice(1) ?? 'mp3').toLowerCase()}`;
    if (!['.mp3', '.wav', '.ogg', '.flac'].includes(ext)) return [];
    return [{
      provider: 'openverse', url: r.foreign_landing_url ?? r.url, license: ovLicense(r), title: r.title ?? 'untitled', duration: sec,
      credit: `${kind === 'music' ? 'Music' : 'Sound'}: "${r.title ?? 'untitled'}" by ${r.creator || 'unknown'} / ${ovLicense(r)} (${r.source ?? r.provider ?? 'Openverse'})`,
      downloadUrl: r.url, ext,
    }];
  });
  return hits.slice(0, limit);
}

/** Coverr music (royalty-free tracks). Premium tracks are skipped. */
export async function searchCoverrAudio(query: string, kind: AudioKind, limit = 8): Promise<AudioHit[]> {
  const key = env('COVERR_API_KEY');
  if (!key || kind !== 'music') return [];
  const data = await getJson(`https://api.coverr.co/audios?${new URLSearchParams({ query, page_size: String(limit), sort: 'popular' })}`, { 'x-api-key': key });
  const list: any[] = data.hits ?? data.audios ?? data.data ?? (Array.isArray(data) ? data : []);
  return list.flatMap((a): AudioHit[] => {
    const url = a.urls?.masterDownload || a.urls?.previewDownload || a.urls?.preview;
    if (a.isPremium || !url) return [];
    const ext = path.extname(new URL(url).pathname).toLowerCase() || path.extname(a.filename ?? '').toLowerCase() || '.mp3';
    return [{
      provider: 'coverr', url: `https://coverr.co/music/${a.slug ?? a.id}`, license: 'Coverr License', title: a.title ?? a.name ?? 'untitled',
      duration: a.duration, credit: `Music: "${a.title ?? a.name}" / Coverr`, downloadUrl: url, ext,
    }];
  });
}

/** Music beds from projects/_library/music whose file name contains a search word. */
export function searchLibraryAudio(queries: string[]): AudioHit[] {
  const words = [...new Set(queries.flatMap((q) => q.toLowerCase().split(/[^\p{L}\p{N}]+/u)).filter((w) => w.length >= 3))];
  const dir = path.join(LIBRARY, 'music');
  return listFiles(dir, AUDIO_EXT)
    .filter((f) => words.some((w) => f.toLowerCase().includes(w)))
    .map((f) => ({ provider: 'library', url: '', license: 'see .txt next to the file', credit: '', title: f, downloadUrl: '', ext: path.extname(f), localAbs: path.join(dir, f) }));
}

export async function downloadAudio(hit: AudioHit, destNoExt: string): Promise<string> {
  const res = await fetch(hit.downloadUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status} (${hit.downloadUrl})`);
  const dest = destNoExt + hit.ext;
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  const { downloadUrl: _d, ext: _e, localAbs: _l, ...meta } = hit;
  writeJson(destNoExt + '.json', { ...meta, fetchedAt: new Date().toISOString() });
  return dest;
}

/** Hits from projects/_library when the file name contains at least one search word (3+ letters). */
export function searchLibrary(queries: string[], kind: 'image' | 'video'): Array<Hit & { localAbs: string }> {
  const words = [...new Set(queries.flatMap((q) => q.toLowerCase().split(/[^\p{L}\p{N}]+/u)).filter((w) => w.length >= 3))];
  const dir = path.join(LIBRARY, kind === 'video' ? 'broll' : 'images');
  const exts = kind === 'video' ? VIDEO_EXT : IMAGE_EXT;
  return listFiles(dir, exts)
    .filter((f) => words.some((w) => f.toLowerCase().includes(w)))
    .map((f) => {
      const sidecar = path.join(dir, f.replace(/\.[^.]+$/, '.json'));
      const meta = fs.existsSync(sidecar) ? JSON.parse(fs.readFileSync(sidecar, 'utf8')) : {};
      return {
        provider: 'library', url: meta.url ?? '', license: meta.license ?? 'unknown', credit: meta.credit, kind,
        downloadUrl: '', ext: path.extname(f), localAbs: path.join(dir, f),
      } satisfies Hit & { localAbs: string };
    });
}

export async function download(hit: Hit, destNoExt: string): Promise<string> {
  const res = await fetch(hit.downloadUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status} (${hit.downloadUrl})`);
  const dest = destNoExt + hit.ext;
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  if (hit.kind === 'image') {
    // Some sources report the original size but serve a smaller rendition – trust the file, not the metadata
    const out = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', dest], { quiet: true });
    const [w, h] = out.stdout.trim().split(',').map(Number);
    if (w && h) {
      if (w < MIN_SMALL_WIDTH) {
        fs.rmSync(dest);
        throw new Error(`${hit.provider}: only ${w}×${h} px delivered (min. ${MIN_SMALL_WIDTH}) – skipped (${hit.url})`);
      }
      // too small for the split, but worth an upscale (npm run upscale)
      Object.assign(hit, { width: w, height: h }, w < MIN_PHOTO_WIDTH ? { small: true } : {});
    }
  } else {
    const p = await probe(dest).catch(() => null);
    if (p?.width && p.width < MIN_VIDEO_WIDTH) {
      fs.rmSync(dest);
      throw new Error(`${hit.provider}: video only ${p.width}×${p.height} px (min. ${MIN_VIDEO_WIDTH}) – skipped (${hit.url})`);
    }
    if (p?.width) Object.assign(hit, { width: p.width, height: p.height });
  }
  if (hit.trackUrl && hit.provider === 'unsplash') {
    await fetch(hit.trackUrl, { headers: { Authorization: `Client-ID ${env('UNSPLASH_ACCESS_KEY')}` } }).catch(() => undefined);
  }
  if (hit.trackUrl && hit.provider === 'coverr') {
    // recommended by Coverr when files are stored ahead of time
    await fetch(hit.trackUrl, { method: 'PATCH', headers: { 'x-api-key': env('COVERR_API_KEY') ?? '' } }).catch(() => undefined);
  }
  const { downloadUrl: _d, ext: _e, trackUrl: _t, ...meta } = hit;
  writeJson(destNoExt + '.json', { ...meta, fetchedAt: new Date().toISOString() });
  return dest;
}

/** Search links for sources the script does not download automatically (rights). */
export function searchLinks(query: string): Record<string, string> {
  const q = encodeURIComponent(query);
  const links: Record<string, string> = {
    'Google Images (press photos)': `https://www.google.com/search?tbm=isch&q=${q}`,
    'Getty Images Editorial (license required)': `https://www.gettyimages.com/search/2/image?phrase=${q}&family=editorial`,
    'dpa Picture-Alliance (license required)': `https://www.picture-alliance.com/search?q=${q}`,
    YouTube: `https://www.youtube.com/results?search_query=${q}`,
  };
  // your own press portals (manufacturers, agencies): brand/data/press-portals.json = [{ "name": "…", "searchUrl": "https://…{q}…" }]
  const portals = path.join(BRAND, 'data', 'press-portals.json');
  if (fs.existsSync(portals)) {
    for (const p of JSON.parse(fs.readFileSync(portals, 'utf8')) as Array<{ name: string; searchUrl: string }>) links[p.name] = p.searchUrl.replace('{q}', q);
  }
  return links;
}
