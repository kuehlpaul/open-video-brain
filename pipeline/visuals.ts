/**
 * Photo, video or graphic? – checks and computes the decision and fetches the media.
 *   npm run visuals -- <slug>                    validate work/visuals.json, compute the decision per beat, summary
 *   npm run visuals -- <slug> --search           search for photo/video beats without media (library, Commons, Openverse, NASA, Pexels, Pixabay, Unsplash, Coverr)
 *   npm run visuals -- <slug> --search --beat <id> [--n 3]
 *   npm run visuals -- <slug> --pick <beat>:<nr> pick candidate no. → work/assets/<beat>.<ext>, set the source line
 *
 * Claude writes work/visuals.json (skill /visuals-plan) with the SIGNALS per beat; the decision is computed
 * deterministically by pipeline/schemas/visuals.ts (decide). The script only downloads freely licensed media.
 * Press photos and YouTube clips: search links in the report; put them into work/assets/ manually and set `asset`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { loadProject, parseCli } from './lib/cli';
import { formatTime, log, main } from './lib/log';
import { availableProviders, download, searchCommons, searchCoverr, searchLibrary, searchLinks, searchNasa, searchOpenverse, searchPexels, searchPixabay, searchUnsplash, type Hit, type Provider } from './lib/media-search';
import { ensureDir, readJson, rootRel, writeJson } from './lib/paths';
import { Beat, Visuals, decide, type Candidate } from './schemas/visuals';

const USAGE = 'npm run visuals -- <slug> [--search [--beat <id>] [--n 3]] [--pick <beat>:<nr>]';

main(async () => {
  const { values, positionals } = parseCli(USAGE, {
    search: { type: 'boolean', default: false },
    beat: { type: 'string' },
    n: { type: 'string', default: '3' },
    pick: { type: 'string' },
  });
  const { paths } = loadProject(positionals[0], USAGE);
  const file = path.join(paths.work, 'visuals.json');
  if (!fs.existsSync(file)) throw new Error('work/visuals.json missing – Claude writes it (skill /visuals-plan).');
  const parsed = Visuals.safeParse(readJson(file));
  if (!parsed.success) throw new Error(`visuals.json is invalid:\n${z.prettifyError(parsed.error)}`);
  const vis = parsed.data;

  const ids = new Set<string>();
  for (const b of vis.beats) {
    if (ids.has(b.id)) throw new Error(`Duplicate beat ID: ${b.id}`);
    ids.add(b.id);
    const c = decide(b.signals);
    b.computed = { ...c, decision: b.override?.decision ?? c.decision };
  }

  if (values.pick) {
    const [id, nr] = values.pick.split(':');
    const beat = vis.beats.find((b) => b.id === id);
    const cand = beat?.candidates[Number(nr) - 1];
    if (!beat || !cand) throw new Error(`Candidate not found: ${values.pick} (format <beat>:<nr>, numbers start at 1)`);
    const abs = path.resolve(paths.dir, cand.file);
    if (cand.provider === 'library') {
      beat.asset = cand.file;
    } else {
      const dest = path.join(ensureDir(paths.assets), `${beat.id}${path.extname(abs)}`);
      fs.copyFileSync(abs, dest);
      for (const ext of ['.json']) {
        const side = abs.replace(/\.[^.]+$/, ext);
        if (fs.existsSync(side)) fs.copyFileSync(side, dest.replace(/\.[^.]+$/, ext));
      }
      beat.asset = path.relative(paths.dir, dest).split(path.sep).join('/');
    }
    beat.source = cand.credit ?? beat.source;
    writeJson(file, vis);
    log.ok(`${beat.id}: ${beat.asset}${beat.source ? `  (${beat.source})` : ''}`);
    return;
  }

  if (values.search) await searchAll(vis.beats, paths, values.beat, Math.max(1, Number(values.n) || 3));

  writeJson(file, vis);
  report(vis.beats);
});

async function searchAll(beats: Beat[], paths: ReturnType<typeof loadProject>['paths'], only: string | undefined, n: number) {
  const providers = availableProviders();
  const missing = [['pexels', 'PEXELS_API_KEY'], ['pixabay', 'PIXABAY_API_KEY'], ['unsplash', 'UNSPLASH_ACCESS_KEY'], ['coverr', 'COVERR_API_KEY']].filter(([p]) => !providers.includes(p as Provider));
  log.step(`Searching: ${providers.join(', ')}${missing.length ? `  (not set up: ${missing.map(([p, k]) => `${p} → ${k}`).join(', ')})` : ''}`);
  const lines = ['# Candidates', '', 'Pick: `npm run visuals -- <slug> --pick <beat>:<nr>`. Check photos in an image viewer: subject not cropped, fitting motif.', ''];
  for (const b of beats) {
    const decision = b.computed!.decision;
    if (decision === 'graphic' || b.asset || (only && b.id !== only)) continue;
    if (!b.queries.length) {
      log.warn(`${b.id}: no search terms (queries) – skipped`);
      continue;
    }
    const kind = decision === 'video' ? 'video' : 'image';
    const wanted = (b.providers ?? providers).filter((p): p is Provider => providers.includes(p));
    const hits: Array<Hit & { localAbs?: string }> = [];
    if (wanted.includes('library')) hits.push(...searchLibrary(b.queries, kind));
    for (const q of b.queries) {
      const jobs: Array<Promise<Hit[]>> = [];
      if (wanted.includes('commons') && kind === 'image') jobs.push(searchCommons(q));
      if (wanted.includes('openverse') && kind === 'image') jobs.push(searchOpenverse(q));
      if (wanted.includes('unsplash') && kind === 'image') jobs.push(searchUnsplash(q));
      if (wanted.includes('nasa')) jobs.push(searchNasa(q, kind));
      if (wanted.includes('coverr') && kind === 'video') jobs.push(searchCoverr(q));
      if (wanted.includes('pexels')) jobs.push(searchPexels(q, kind));
      if (wanted.includes('pixabay')) jobs.push(searchPixabay(q, kind));
      for (const r of await Promise.allSettled(jobs)) {
        if (r.status === 'fulfilled') hits.push(...r.value);
        else log.warn(`${b.id} "${q}": ${r.reason instanceof Error ? r.reason.message : r.reason}`);
      }
    }
    const seen = new Set<string>();
    const unique = hits.filter((h) => (seen.has(h.url || h.localAbs || '') ? false : (seen.add(h.url || h.localAbs || ''), true)));
    // library first (free, already vetted), then the sources take turns – so the pick isn't all from one source
    const top = [...unique.filter((h) => h.provider === 'library'), ...roundRobin(unique.filter((h) => h.provider !== 'library'))].slice(0, n);
    const cands: Candidate[] = [];
    for (const [i, h] of top.entries()) {
      try {
        if (h.provider === 'library' && h.localAbs) {
          cands.push({ file: path.relative(paths.dir, h.localAbs).split(path.sep).join('/'), provider: h.provider, url: h.url, license: h.license, credit: h.credit, kind: h.kind });
        } else {
          const abs = await download(h, path.join(ensureDir(path.join(paths.assets, 'candidates')), `${b.id}-${i + 1}`));
          const { downloadUrl: _d, ext: _e, trackUrl: _t, ...rest } = h;
          cands.push({ ...rest, file: path.relative(paths.dir, abs).split(path.sep).join('/') });
        }
      } catch (e) {
        log.warn(`${b.id}: ${e instanceof Error ? e.message : e}`);
      }
    }
    b.candidates = cands;
    log[cands.length ? 'ok' : 'warn'](`${b.id}: ${cands.length} candidate(s)${cands.length ? '' : ' – nothing usable found'}`);
    lines.push(`## ${b.id} (${decision}) – ${b.text}`, '');
    cands.forEach((c, i) => {
      lines.push(`${i + 1}. \`${c.file}\` · ${c.provider} · ${c.license}${c.width ? ` · ${c.width}×${c.height}` : ''}${c.credit ? ` · ${c.credit}` : ''}${c.url ? ` · ${c.url}` : ''}`);
      if (c.small) lines.push(`   ⚠ small (< 1600 px) – only usable upscaled: \`npm run upscale -- <slug> --pick ${b.id}:${i + 1}\` (costs money, sets asset + source)`);
    });
    if (!cands.length) {
      lines.push('Nothing found automatically. Find one manually (press photo/YouTube), put the file into work/assets/ and set `asset` in visuals.json:');
      for (const q of b.queries.slice(0, 2)) for (const [name, url] of Object.entries(searchLinks(q))) lines.push(`- ${name}: ${url}`);
    }
    lines.push('');
  }
  ensureDir(paths.assets);
  fs.writeFileSync(path.join(paths.work, 'visuals-candidates.md'), lines.join('\n'));
  log.info(`Summary: ${rootRel(path.join(paths.work, 'visuals-candidates.md'))}`);
}

/** Interleaves hits by provider (1st of each source, then 2nd of each …), keeping each source's ranking. */
function roundRobin<T extends { provider: string }>(hits: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const h of hits) groups.set(h.provider, [...(groups.get(h.provider) ?? []), h]);
  const out: T[] = [];
  for (let i = 0; out.length < hits.length; i++) for (const g of groups.values()) if (g[i]) out.push(g[i]);
  return out;
}

function report(beats: Beat[]) {
  log.step('Decisions');
  const dur = (b: Beat, i: number) => (b.to ?? beats[i + 1]?.from ?? b.from + 6) - b.from;
  const by = { photo: 0, video: 0, 'photo+headline': 0, graphic: 0 };
  beats.forEach((b, i) => {
    const c = b.computed!;
    by[c.decision] += dur(b, i);
    const flag = c.decision === 'graphic' ? '▦' : b.asset ? '✓' : '○';
    const why = b.override ? `override: ${b.override.why}` : `footage ${c.footage} : graphic ${c.graphic}`;
    log.info(`${flag} ${formatTime(b.from)}  ${b.id.padEnd(22)} ${c.decision.padEnd(15)} ${why}`);
  });
  const total = Object.values(by).reduce((s, v) => s + v, 0) || 1;
  const real = by.photo + by.video + by['photo+headline'];
  log.info(`Photo/video ${Math.round((real / total) * 100)} % · graphic ${Math.round((by.graphic / total) * 100)} % of beat time (target ≈ 60 : 40)`);
  const open = beats.filter((b) => b.computed!.decision !== 'graphic' && !b.asset);
  if (open.length) {
    log.warn(`${open.length} photo/video beat(s) without media: ${open.map((b) => b.id).join(', ')}`);
    log.info('→ npm run visuals -- <slug> --search, then --pick <beat>:<nr>. If nothing turns up: Placeholder + report, do NOT fall back to text.');
  }
  const uncredited = beats.filter((b) => b.asset && /\.(jpe?g|png|webp)$/i.test(b.asset) && !b.source);
  if (uncredited.length) log.warn(`No source line: ${uncredited.map((b) => b.id).join(', ')} (photos need \`source\`)`);
}
