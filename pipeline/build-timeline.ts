/**
 * edl.json (decisions) → timeline.json (frame-accurate cut for Remotion).
 *   npm run timeline -- <slug>
 *
 * Deterministically:
 *  - tightens speech pauses in footage segments (from word timestamps)
 *  - sets WIDE/PUNCH zoom (switch no sooner than minZoomHold seconds, PUNCH with centerY)
 *  - converts anchors and cues (source time / segment / seconds) to frames
 *  - resolves media paths in props (+ adds image size iw/ih)
 *  - validates the props of every graphic against the component schema
 *  - places whoosh in/out at split/fullscreen transitions (house sound rule)
 *  - builds caption tokens in output time
 * On errors NOTHING is written; all problems are collected and printed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { brand, dbToGain } from '../brand/tokens';
import { componentNames, defs, isComponentName } from '../remotion/components/defs';
import type { ComponentMeta, Layout } from '../remotion/components/types';
import { loadProject, parseCli } from './lib/cli';
import { imageSize, probe } from './lib/exec';
import { snapSeams, wavLevel, type Level } from './lib/seams';
import { digitize } from './lib/numbers';
import { formatTime, log, main } from './lib/log';
import { BRAND, IMAGE_EXT, PROJECTS, baseName, listFiles, publicRel, readJson, writeJson } from './lib/paths';
import { Edl, type Anchor } from './schemas/edl';
import { Visuals, decide } from './schemas/visuals';
import { Timeline, type TimelineClip, type TimelineOverlay } from './schemas/timeline';
import { FootageIndex, Transcript, VoiceManifest, type Word } from './schemas/transcript';

const USAGE = 'npm run timeline -- <slug>';

type Sub = { a: number; b: number; outFrom: number };
type SegInfo = { kind: 'footage' | 'generated'; clip?: string; outFrom: number; outTo: number; subs: Sub[] };
type Token = { text: string; startMs: number; endMs: number; timestampMs: number | null; confidence: number | null };
type Ctx = { issues: string[]; warnings: string[]; projectDir: string; portrait: boolean };

main(async () => {
  const { positionals } = parseCli(USAGE, {});
  const { paths, config, source } = loadProject(positionals[0], USAGE);
  if (!fs.existsSync(paths.edl)) throw new Error('work/edl.json missing – Claude writes it (skill /edit-plan).');
  const parsed = Edl.safeParse(readJson(paths.edl));
  if (!parsed.success) throw new Error(`edl.json is invalid:\n${z.prettifyError(parsed.error)}`);
  const edl = parsed.data;
  if (edl.format !== config.format) log.warn(`edl.format (${edl.format}) ≠ project.json (${config.format})`);

  const issues: string[] = [];
  const warnings: string[] = [];
  const footage = new Map(
    (fs.existsSync(source.footageIndex) ? FootageIndex.parse(readJson(source.footageIndex)) : []).map((f) => [f.clip, f]),
  );
  const manifest = fs.existsSync(paths.voiceManifest) ? VoiceManifest.parse(readJson(paths.voiceManifest)) : {};
  const transcriptCache = new Map<string, Word[] | null>();
  const wordsOf = (clip: string): Word[] | null => {
    if (!transcriptCache.has(clip)) {
      const f = path.join(source.transcripts, `${baseName(clip)}.json`);
      transcriptCache.set(clip, fs.existsSync(f) ? Transcript.parse(readJson(f)).words.filter((w) => w.type === 'word') : null);
    }
    return transcriptCache.get(clip)!;
  };

  const firstFootage = edl.sequence.find((s) => s.type === 'footage');
  const fps = edl.fps ?? pickFps(firstFootage?.type === 'footage' ? footage.get(firstFootage.clip)?.fps : undefined);
  const { width, height } = edl.resolution ?? (edl.format === 'short' ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 });
  const portrait = height > width;
  const ctx: Ctx = { issues, warnings, projectDir: paths.dir, portrait };
  const pacing = { ...brand.pacing[edl.format], ...edl.pacing };
  // Zoom center: shorts keep headroomTop of headroom above the head (otherwise the 1.4 close-up crops the head),
  // without black bars at the top/bottom. Longform: fixed punchCenterY.
  const headroomTop = 'headroomTop' in pacing ? (pacing.headroomTop as number) : undefined;
  const punchCenter = (zoom: number) => {
    if (zoom <= 1) return 0.5;
    if (headroomTop === undefined) return pacing.punchCenterY;
    return Math.min(0.5 * zoom, Math.max(1 - 0.5 * zoom, zoom * (0.5 - headroomTop)));
  };
  const framing = edl.framing ?? { focusX: 0.5, focusY: 0.5 };

  const clips: TimelineClip[] = [];
  const tokens: Token[] = [];
  const segMap = new Map<string, SegInfo>();
  let cursor = 0;
  let zoomIdx = 0;
  let lastZoomChange = -Infinity;
  let removed = 0;
  // Number words → digits only for German projects (lib/numbers.ts is German-specific)
  const isGerman = config.language.toLowerCase().startsWith('de');
  const levels = new Map<string, Level | undefined>();
  // 9:16: speaker centered – crop per cut from the face track (npm run faces), median face center within the cut
  const faceTracks = new Map<string, Array<[number, number, number, number]> | undefined>();
  const autoFocused = new Set<string>();
  const autoFocus = (id: string, fx: number | undefined) => {
    if (fx !== undefined) autoFocused.add(id);
    return fx;
  };
  const faceFocusX = (clip: string, a: number, b: number, srcAspect: number): number | undefined => {
    if (!faceTracks.has(clip)) {
      const f = path.join(source.dir, 'work', 'faces', `${baseName(clip)}.json`);
      faceTracks.set(clip, fs.existsSync(f) ? (readJson(f) as { samples: Array<[number, number, number, number]> }).samples : undefined);
    }
    const xs = (faceTracks.get(clip) ?? []).filter(([t]) => t >= a - 0.25 && t <= b + 0.25).map(([, cx]) => cx).sort((x, y) => x - y);
    if (!xs.length) return undefined;
    const cx = xs[Math.floor(xs.length / 2)];
    const vis = width / (height * srcAspect);
    if (vis >= 1) return undefined; // the source is as narrow as the frame (9:16 footage in a Short): nothing to pan
    return Math.round(Math.min(1, Math.max(0, (cx - vis / 2) / (1 - vis))) * 1000) / 1000;
  };
  const pushWords = (words: Array<{ text: string; start: number; end: number }>, offsetSec: number) => {
    // number words → digits (German: 19.990, 27,5, 3.7); capitalize sentence starts, even if the cut starts mid-sentence
    for (const w of isGerman ? digitize(words) : words) {
      const prev = tokens.length ? tokens[tokens.length - 1].text.trim() : '';
      const startsSentence = !prev || (/[.!?]$/.test(prev) && !/^\p{Lu}{1,3}\.$/u.test(prev));
      const text = startsSentence ? w.text.charAt(0).toUpperCase() + w.text.slice(1) : w.text;
      tokens.push({
        text: (tokens.length ? ' ' : '') + text,
        startMs: Math.round((offsetSec + w.start) * 1000),
        endMs: Math.round((offsetSec + w.end) * 1000),
        timestampMs: null,
        confidence: null,
      });
    }
  };
  const generatedBase = { trimBefore: 0, zoom: 1, centerY: 0.5, push: 0, focusX: 0.5, focusY: 0.5, audioTrimBefore: 0, volume: 1 };

  for (const seg of edl.sequence) {
    if (segMap.has(seg.id)) issues.push(`Duplicate segment ID: ${seg.id}`);
    if (seg.type === 'footage') {
      const info = footage.get(seg.clip);
      if (!info) {
        issues.push(`[${seg.id}] clip "${seg.clip}" not in work/footage.json (npm run ingest?)`);
        continue;
      }
      if (seg.out <= seg.in) issues.push(`[${seg.id}] out (${seg.out}) must be after in (${seg.in})`);
      if (seg.out > info.duration + 0.05) issues.push(`[${seg.id}] out ${seg.out}s is past the clip end ${info.duration.toFixed(2)}s`);
      const words = wordsOf(seg.clip);
      if (!words) warnings.push(`[${seg.id}] no transcript for ${seg.clip} – pauses stay untouched`);
      const inSeg = (words ?? []).filter((w) => w.end > seg.in && w.start < seg.out);
      let ranges = (seg.tightenPauses ?? true) && inSeg.length ? tighten(seg.in, seg.out, inSeg, pacing) : [[seg.in, seg.out]];
      const variantAbs = edl.audioVariant ? path.join(source.audio, `${baseName(seg.clip)}.${edl.audioVariant}.wav`) : undefined;
      if (variantAbs && !fs.existsSync(variantAbs)) warnings.push(`[${seg.id}] audio track ${path.basename(variantAbs)} missing – using ${baseName(seg.clip)}.wav`);
      const audioAbs = variantAbs && fs.existsSync(variantAbs) ? variantAbs : path.join(source.audio, `${baseName(seg.clip)}.wav`);
      // shorts: seams on quiet spots (clipped word onsets sound like pitch jumps)
      if (edl.format === 'short' && words) {
        if (!levels.has(audioAbs)) levels.set(audioAbs, wavLevel(audioAbs));
        const level = levels.get(audioAbs);
        if (level) ranges = snapSeams(ranges as Array<[number, number]>, words, level, fps);
      }
      const audioSrc = fs.existsSync(audioAbs) ? publicRel(audioAbs) : undefined;
      const info2: SegInfo = { kind: 'footage', clip: seg.clip, outFrom: cursor, outTo: cursor, subs: [] };
      let kept = 0;
      ranges.forEach(([a, b], k) => {
        const f0 = Math.round(a * fps);
        const f1 = Math.round(b * fps);
        const dur = f1 - f0;
        if (dur < 3) return;
        // size changes only at cuts and no sooner than minZoomHold seconds (never the same size twice in a row)
        if (seg.zoom === undefined && (cursor - lastZoomChange) / fps >= pacing.minZoomHold) {
          if (lastZoomChange !== -Infinity) zoomIdx++;
          lastZoomChange = cursor;
        }
        const zoom = seg.zoom ?? pacing.zoomLevels[zoomIdx % pacing.zoomLevels.length];
        clips.push({
          id: `${seg.id}.${k + 1}`,
          kind: 'footage',
          from: cursor,
          duration: dur,
          src: info.src,
          trimBefore: f0,
          zoom,
          centerY: punchCenter(zoom),
          push: pacing.push,
          focusX: seg.focusX ?? autoFocus(`${seg.id}.${k + 1}`, portrait ? faceFocusX(seg.clip, a, b, info.width / info.height) : undefined) ?? framing.focusX,
          focusY: seg.focusY ?? framing.focusY,
          audioSrc,
          audioTrimBefore: f0,
          volume: 1,
        });
        info2.subs.push({ a: f0 / fps, b: f1 / fps, outFrom: cursor });
        const startSec = f0 / fps;
        const endSec = f1 / fps;
        pushWords(
          inSeg
            .filter((w) => (w.start + w.end) / 2 >= startSec && (w.start + w.end) / 2 <= endSec)
            .map((w) => ({ text: w.text, start: Math.max(w.start, startSec) - startSec, end: Math.min(w.end, endSec) - startSec })),
          cursor / fps,
        );
        cursor += dur;
        kept += dur / fps;
      });
      removed += Math.max(0, seg.out - seg.in - kept);
      info2.outTo = cursor;
      segMap.set(seg.id, info2);
    } else if (seg.type === 'graphic') {
      const dur = Math.round(seg.duration * fps);
      const visual = await resolveVisual(seg.id, seg.visual, ctx, fps);
      clips.push({ id: seg.id, kind: 'generated', from: cursor, duration: dur, ...generatedBase, visual });
      segMap.set(seg.id, { kind: 'generated', outFrom: cursor, outTo: cursor + dur, subs: [] });
      cursor += dur;
    } else {
      const ins = edl.voiceInserts.find((v) => v.id === seg.voiceInsert);
      const entry = manifest[seg.voiceInsert];
      if (!ins) {
        issues.push(`[${seg.id}] voiceInsert "${seg.voiceInsert}" missing from voiceInserts`);
        continue;
      }
      if (!entry) {
        issues.push(`[${seg.id}] audio for "${seg.voiceInsert}" missing – npm run voice -- ${config.slug}`);
        continue;
      }
      if (entry.text !== ins.text) warnings.push(`[${seg.id}] text changed, audio is stale – npm run voice -- ${config.slug}`);
      const dur = Math.ceil((entry.duration + 0.3) * fps);
      const visual = await resolveVisual(seg.id, seg.visual, ctx, fps);
      clips.push({ id: seg.id, kind: 'generated', from: cursor, duration: dur, ...generatedBase, audioSrc: entry.src, visual });
      pushWords(entry.words, cursor / fps);
      segMap.set(seg.id, { kind: 'generated', outFrom: cursor, outTo: cursor + dur, subs: [] });
      cursor += dur;
    }
  }
  // change the crop only when the size changes (otherwise the frame jumps sideways at pause cuts):
  // consecutive cuts at the same zoom level share one duration-weighted crop.
  for (let i = 0; i < clips.length; ) {
    let j = i;
    while (j + 1 < clips.length && clips[j + 1].kind === 'footage' && clips[i].kind === 'footage' && clips[j + 1].zoom === clips[i].zoom && autoFocused.has(clips[j + 1].id)) j++;
    const run = clips.slice(i, j + 1).filter((c) => autoFocused.has(c.id));
    if (run.length > 1) {
      const fx = run.reduce((acc, c) => acc + c.focusX * c.duration, 0) / run.reduce((acc, c) => acc + c.duration, 0);
      for (const c of run) c.focusX = Math.round(fx * 1000) / 1000;
    }
    i = j + 1;
  }
  const total = cursor;
  if (total <= 0) issues.push('Timeline is empty.');

  /** Footage segments in the order a cue should be looked up: with an anchor segment, that segment first, then later
   *  and earlier segments of the SAME clip, then the other clips. Source times repeat across clips (every file starts
   *  at 0), so without this a cue could land in a different clip that happens to cover the same second. */
  const footageSegs = (near?: string): SegInfo[] => {
    const all = [...segMap.entries()].filter(([, s]) => s.kind === 'footage');
    const idx = near ? all.findIndex(([k]) => k === near) : -1;
    const clip = idx >= 0 ? all[idx][1].clip : undefined;
    if (!clip) return all.map(([, s]) => s);
    const same = (from: number, to: number) => all.slice(from, to).filter(([, s]) => s.clip === clip);
    return [...same(idx, all.length), ...same(0, idx), ...all.filter(([, s]) => s.clip !== clip)].map(([, s]) => s);
  };
  /** Source time t → output frame. With segId only within that segment; otherwise in the first matching footage
   *  segment, preferring the clip of the segment `near` (the overlay's anchor). */
  const sourceToOut = (id: string, t: number, segId?: string, near?: string): number | null => {
    const cands = segId ? ([segMap.get(segId)].filter(Boolean) as SegInfo[]) : footageSegs(near);
    for (const s of cands) {
      if (s.kind !== 'footage') return s.outFrom;
      const hit = s.subs.find((u) => t >= u.a && t < u.b);
      if (hit) return hit.outFrom + Math.round((t - hit.a) * fps);
      if (segId) {
        const next = s.subs.find((u) => u.a > t);
        return next ? next.outFrom : Math.max(s.outFrom, s.outTo - 1);
      }
    }
    // inside a tightened pause: next cut after it (same clip as the anchor first)
    const nearClip = near ? segMap.get(near)?.clip : undefined;
    const laterIn = (segs: SegInfo[]) => segs.flatMap((s) => s.subs).filter((u) => u.a > t).sort((x, y) => x.a - y.a)[0];
    for (const segs of nearClip ? [cands.filter((s) => s.clip === nearClip), cands] : [cands]) {
      const later = laterIn(segs);
      if (later && later.a - t < 2) return later.outFrom;
    }
    issues.push(`[${id}] source time ${t}s is not inside any footage segment of the EDL`);
    return null;
  };
  const resolve = (id: string, at: Anchor): number | null => {
    if ('out' in at) return Math.round(at.out * fps);
    const s = segMap.get(at.seg);
    if (!s) {
      issues.push(`[${id}] anchor refers to unknown segment "${at.seg}"`);
      return null;
    }
    if ('offset' in at) return s.outFrom + Math.round(at.offset * fps);
    return sourceToOut(id, at.t, at.seg);
  };

  // panel/fullscreen edges close to a speaker cut snap onto that cut –
  // otherwise the speaker jumps and a split second later the graphic arrives (double cut).
  const SNAP = Math.round(fps * 0.5);
  const cutFrames = clips.map((c) => c.from).filter((f) => f > 0);
  const snapToCut = (f: number) => {
    let best = f;
    let bd = SNAP + 1;
    for (const c of cutFrames) {
      const d = Math.abs(c - f);
      if (d > 0 && d <= SNAP && d < bd) [best, bd] = [c, d];
    }
    return best;
  };

  const overlays: TimelineOverlay[] = [];
  for (const o of edl.overlays) {
    const anchor = resolve(o.id, o.at);
    if (anchor === null) continue;
    let from = anchor;
    if (!isComponentName(o.component)) {
      issues.push(`[${o.id}] component "${o.component}" does not exist. Available: ${componentNames.join(', ')}`);
      continue;
    }
    checkLogo(o.id, o.component, ctx);
    const meta = defs[o.component].meta as ComponentMeta;
    const layout = pickLayout(o.id, o.component, meta, o.layout, ctx);
    if (!layout) continue;
    let duration = Math.round((o.duration ?? meta.seconds) * fps);
    if (from >= total) {
      issues.push(`[${o.id}] starts at ${formatTime(from / fps)}, but the video is only ${formatTime(total / fps)} long`);
      continue;
    }
    // graphics end no later than where the next fullscreen segment begins
    const nextFull = clips.find((c) => c.kind === 'generated' && c.from > from);
    const limit = nextFull ? nextFull.from : total;
    if (from + duration > limit) {
      if ((from + duration - limit) / fps > 0.5) {
        warnings.push(`[${o.id}] shortened by ${((from + duration - limit) / fps).toFixed(1)} s (${limit === total ? 'end of video' : 'next fullscreen segment'})`);
      }
      duration = limit - from;
    }
    if (layout !== 'overlay') {
      const end = Math.min(limit, snapToCut(from + duration));
      from = snapToCut(from);
      duration = end - from;
    }
    // shorts are faster: photos from 2.5 s, cards from 3.5 s – longform keeps meta.minSeconds (5 s)
    const shortMin = 'minSeconds' in pacing ? (pacing.minSeconds as Record<string, number>) : undefined;
    const minSec = shortMin ? (shortMin[o.component] ?? shortMin.default) : meta.minSeconds;
    if (minSec && duration / fps < minSec - 0.05 && layout !== 'overlay') {
      warnings.push(`[${o.id}] ${o.component} is only on screen for ${(duration / fps).toFixed(1)} s (rule: at least ${minSec} s)`);
    }
    if (duration < Math.round(fps * 0.8)) {
      issues.push(`[${o.id}] is only visible for ${(duration / fps).toFixed(1)} s – move the anchor earlier`);
      continue;
    }
    const withCues = resolveCues(o.props, (t) => {
      const out = sourceToOut(o.id, t, undefined, 'seg' in o.at ? o.at.seg : undefined);
      return out === null ? 0 : out - from;
    }, fps);
    const withMedia = await resolveMedia(o.id, withCues, ctx);
    const res = (defs[o.component].schema as z.ZodType).safeParse(withMedia);
    if (!res.success) {
      issues.push(`[${o.id}] invalid props for ${o.component}:\n${z.prettifyError(res.error)}`);
      continue;
    }
    overlays.push({ id: o.id, component: o.component, layout, from, duration, props: withMedia as Record<string, unknown> });
  }

  // never two panels/fullscreens at once
  const media = overlays.filter((o) => o.layout !== 'overlay').sort((a, b) => a.from - b.from);
  for (let i = 1; i < media.length; i++) {
    const prev = media[i - 1];
    const over = prev.from + prev.duration - media[i].from;
    // a few frames of overlap come from snapping to cuts → the previous graphic ends where the next starts
    if (over > 0 && over <= SNAP && media[i].from - prev.from >= fps) prev.duration -= over;
    else if (over > 0) {
      issues.push(`[${media[i].id}] overlaps [${prev.id}] – only one panel/fullscreen can be on screen at a time`);
    }
  }

  // footage or graphic? Lint against the rule (skill /visuals-plan, work/visuals.json)
  const usesMedia = (o: { component: string }) => Boolean((defs[o.component as keyof typeof defs]?.meta as ComponentMeta | undefined)?.usesMedia);
  const mediaFrames = media.reduce((s, o) => s + o.duration, 0);
  const realFrames = media.filter(usesMedia).reduce((s, o) => s + o.duration, 0);
  const realShare = mediaFrames ? realFrames / mediaFrames : 0;
  if (media.length >= 4 && realShare < 0.5) {
    warnings.push(`Only ${Math.round(realShare * 100)} % of panel/fullscreen time is real footage (photo, video); target ≈ 60 %. Check where an image fits better (skill /visuals-plan).`);
  }
  let chain: string[] = [];
  const flushChain = () => {
    if (chain.length >= 3) warnings.push(`${chain.length} graphics in a row without photo/video (${chain.join(' → ')}) – alternate.`);
    chain = [];
  };
  for (const o of media) {
    if (usesMedia(o)) flushChain();
    else chain.push(o.id);
  }
  flushChain();
  const visualsFile = path.join(paths.work, 'visuals.json');
  if (fs.existsSync(visualsFile)) {
    const vp = Visuals.safeParse(readJson(visualsFile));
    if (!vp.success) warnings.push(`visuals.json is invalid, footage/graphic check skipped:\n${z.prettifyError(vp.error)}`);
    else {
      const outFrameOf = (t: number): number | null => {
        for (const s of segMap.values()) {
          const hit = s.subs.find((u) => t >= u.a && t < u.b);
          if (hit) return hit.outFrom + Math.round((t - hit.a) * fps);
        }
        return null;
      };
      for (const b of vp.data.beats) {
        const decision = b.override?.decision ?? decide(b.signals).decision;
        if (decision === 'graphic') continue;
        const f = outFrameOf(b.from);
        if (f === null) continue; // beat lies in a part that is not in the cut
        const hit = media.find((o) => f >= o.from && f < o.from + o.duration);
        if (hit && !usesMedia(hit)) {
          warnings.push(`[${hit.id}] ${hit.component} sits on beat "${b.id}", which calls for photo/video (${decision}) – use a photo/video${b.asset ? ` (${b.asset})` : ''} or override it with a reason in visuals.json.`);
        }
      }
    }
  } else if (!ctx.portrait) {
    const concrete = readConcreteTerms();
    for (const o of media) {
      if (usesMedia(o) || !['Statement', 'Words', 'Tiles', 'List'].includes(o.component)) continue;
      const text = collectStrings(o.props).join(' ').toLowerCase();
      // whole words only, so "car" doesn't match "card"
      const found = concrete.filter((w) => {
        const escaped = w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'u').test(text);
      });
      if (found.length) warnings.push(`[${o.id}] ${o.component} names concrete things (${found.slice(0, 3).join(', ')}) – consider photo/video. Record the decision: skill /visuals-plan (work/visuals.json missing).`);
    }
  }

  // sound: whoosh in 15 f before each switch speaker → panel/fullscreen, whoosh out ends on the cut back
  const sfxDur = await sfxDurations();
  const sfx: Array<{ name: string; from: number; volume: number }> = [];
  const lead = brand.sound.whooshLeadFrames;
  const outDur = Math.round((sfxDur.get('whoosh_out') ?? 1.7) * fps);
  for (let i = 0; i < media.length; i++) {
    const o = media[i];
    if (edl.overlays.find((x) => x.id === o.id)?.whoosh === false) continue;
    const prevEnd = i > 0 ? media[i - 1].from + media[i - 1].duration : -Infinity;
    const next = media[i + 1];
    const end = o.from + o.duration;
    if (sfxDur.has('whoosh_in') && o.from - prevEnd > 1 && o.from > lead) sfx.push({ name: 'whoosh_in', from: o.from - lead, volume: dbToGain(brand.sound.whooshInDb) });
    if (sfxDur.has('whoosh_out') && (!next || next.from - end > 1) && end < total - 2) sfx.push({ name: 'whoosh_out', from: Math.max(0, end - outDur), volume: dbToGain(brand.sound.whooshOutDb) });
  }
  for (const c of edl.sfx) {
    if (!sfxDur.has(c.name)) {
      warnings.push(`Sound "${c.name}" not in brand/sfx – skipped. Add brand/sfx/${c.name}.mp3 (names: brand/sfx/README.md)${sfxDur.size ? `; available: ${[...sfxDur.keys()].join(', ')}` : ''}`);
      continue;
    }
    const at = resolve(`sfx ${c.name}`, c.at);
    if (at === null) continue;
    const len = Math.round(sfxDur.get(c.name)! * fps);
    sfx.push({ name: c.name, from: Math.max(0, c.endsAt ? at - len : at), volume: dbToGain(c.db ?? brand.sound.sfxDefaultDb) });
  }

  const broll = [];
  for (const b of edl.broll) {
    const abs = path.resolve(paths.dir, b.file);
    const from = resolve(b.id, b.at);
    if (!abs.startsWith(PROJECTS)) {
      issues.push(`[${b.id}] B-roll must be under projects/ (e.g. ../_library/broll/…): ${b.file}`);
      continue;
    }
    if (!fs.existsSync(abs)) {
      issues.push(`[${b.id}] B-roll file missing: ${b.file}`);
      continue;
    }
    if (from === null) continue;
    const isImage = IMAGE_EXT.includes(path.extname(abs).toLowerCase());
    if (!isImage) {
      const p = await probe(abs);
      if (b.trim + b.duration > p.duration + 0.05) warnings.push(`[${b.id}] B-roll is shorter (${p.duration.toFixed(1)}s) than trim+duration`);
    }
    broll.push({
      id: b.id,
      src: publicRel(abs),
      from,
      duration: Math.max(1, Math.min(Math.round(b.duration * fps), total - from)),
      trimBefore: Math.round(b.trim * fps),
      mode: b.mode,
      volume: b.volume,
      isImage,
    });
  }

  const music = [];
  if (edl.music) {
    const abs = path.resolve(paths.dir, edl.music.file);
    if (!fs.existsSync(abs)) issues.push(`Music file missing: ${edl.music.file}`);
    else {
      const from = Math.round(edl.music.startAt * fps);
      music.push({
        src: publicRel(abs),
        from,
        duration: Math.max(1, total - from),
        trimBefore: 0,
        volume: edl.music.volume ?? brand.audio.musicVolume,
        fadeInFrames: Math.round(edl.music.fadeIn * fps),
        fadeOutFrames: Math.round(edl.music.fadeOut * fps),
        loop: true,
      });
    }
  }

  for (const w of warnings) log.warn(w);
  if (issues.length) {
    issues.forEach((i) => log.error(i));
    throw new Error(`${issues.length} problem(s) in edl.json – timeline.json was not written.`);
  }

  const timeline = Timeline.parse({
    version: 1,
    slug: config.slug,
    format: edl.format,
    fps,
    width,
    height,
    durationInFrames: total,
    clips,
    broll,
    overlays,
    captions: {
      enabled: edl.captions?.enabled ?? edl.format === 'short',
      style: edl.captions?.style ?? edl.format,
      tokens,
    },
    music,
    sfx: sfx.sort((a, b) => a.from - b.from),
    chapters: edl.sequence
      .filter((sg) => sg.chapter && segMap.has(sg.id))
      .map((sg) => ({ from: segMap.get(sg.id)!.outFrom, title: sg.chapter! })),
  });
  writeJson(paths.timeline, timeline);

  const cuts = clips.filter((c) => c.kind === 'footage').length;
  const mediaShare = total ? media.reduce((s, o) => s + o.duration, 0) / total : 0;
  log.ok(`work/timeline.json: ${formatTime(total / fps)} · ${width}×${height} @ ${fps} fps`);
  log.info(
    `${cuts} footage cuts, ${formatTime(removed)} of pauses/trim removed, ${overlays.length} graphics (media share ${Math.round(mediaShare * 100)} %, of which real footage ${Math.round(realShare * 100)} %), ${sfx.length} sounds`,
  );
});

/** Builds speech islands: gaps > maxPause are removed down to `padding` before/after the word. */
function tighten(inT: number, outT: number, words: Word[], p: { maxPause: number; padding: number }): Array<[number, number]> {
  const sorted = [...words].sort((x, y) => x.start - y.start);
  // numbers ("2027.") get a start time that is too late in the transcript (the spoken word begins ~0.2 s earlier):
  // pull the start forward for pause tightening so the beginning is not cut off.
  const ws = sorted.map((w, i) => (/\d/.test(w.text ?? '') ? { ...w, start: Math.max(w.start - 0.25, i > 0 ? sorted[i - 1].end : 0) } : w));
  const ranges: Array<[number, number]> = [];
  let start = Math.max(inT, ws[0].start - p.padding);
  let lastEnd = ws[0].end;
  for (let i = 1; i < ws.length; i++) {
    const w = ws[i];
    if (w.start - lastEnd > p.maxPause && w.start - p.padding > lastEnd + p.padding) {
      ranges.push([start, Math.min(outT, lastEnd + p.padding)]);
      start = Math.max(inT, w.start - p.padding);
    }
    lastEnd = Math.max(lastEnd, w.end);
  }
  ranges.push([start, Math.min(outT, lastEnd + p.padding)]);
  return ranges.filter(([a, b]) => b > a);
}

/** 50p → 25, 60p → 30, otherwise rounded source fps (default 25) */
function pickFps(source?: number): number {
  if (!source || !Number.isFinite(source)) return 25;
  const f = source > 31 ? source / 2 : source;
  return Math.round(f);
}

/** Picks the layout and checks it against meta (16:9: layouts, 9:16: portrait mode). */
function pickLayout(id: string, name: string, meta: ComponentMeta, wanted: Layout | undefined, ctx: Ctx): Layout | undefined {
  if (ctx.portrait) {
    if (meta.portrait === false) {
      ctx.issues.push(`[${id}] ${name} is not built for 9:16 (meta.portrait = false)`);
      return undefined;
    }
    if (meta.portrait === 'overlay') return 'overlay';
    if (meta.portrait === 'native') return 'full';
    // cards in 9:16: split = graphic on top, speaker below (default) · full = centered on a light background
    return wanted === 'full' ? 'full' : 'split';
  }
  const layout = wanted ?? meta.layouts[0];
  if (!meta.layouts.includes(layout)) {
    ctx.issues.push(`[${id}] ${name} does not support layout "${layout}" (allowed: ${meta.layouts.join(', ')})`);
    return undefined;
  }
  if (meta.portrait === 'native') ctx.warnings.push(`[${id}] ${name} is built for 9:16`);
  return layout;
}

/** The Sting animates the placeholder logo geometry – off for brands without a logo or with their own (brand.json → logo.sting). */
function checkLogo(id: string, component: string, ctx: Ctx) {
  if (component === 'Sting' && !brand.logo.sting) {
    ctx.warnings.push(`[${id}] Sting is off for this brand (${brand.logo.enabled ? 'own logo' : 'no logo'}, brand.json → logo.sting) – remove it from the EDL.`);
  }
}

async function resolveVisual(
  id: string,
  v: { component: string; props: Record<string, unknown> } | { file: string },
  ctx: Ctx,
  fps: number,
): Promise<TimelineClip['visual']> {
  if ('component' in v) {
    if (!isComponentName(v.component)) {
      ctx.issues.push(`[${id}] component "${v.component}" does not exist. Available: ${componentNames.join(', ')}`);
      return undefined;
    }
    checkLogo(id, v.component, ctx);
    const meta = defs[v.component].meta as ComponentMeta;
    if (!ctx.portrait && !meta.layouts.includes('full')) ctx.warnings.push(`[${id}] ${v.component} is not fullscreen – unsuitable as a segment`);
    if (ctx.portrait && meta.portrait === false) ctx.issues.push(`[${id}] ${v.component} is not built for 9:16`);
    const props = await resolveMedia(id, resolveCues(v.props, () => 0, fps), ctx);
    const res = (defs[v.component].schema as z.ZodType).safeParse(props);
    if (!res.success) {
      ctx.issues.push(`[${id}] invalid props for ${v.component}:\n${z.prettifyError(res.error)}`);
      return undefined;
    }
    return { component: v.component, props: props as Record<string, unknown> };
  }
  const abs = path.resolve(ctx.projectDir, v.file);
  if (!abs.startsWith(PROJECTS)) ctx.issues.push(`[${id}] file must be under projects/: ${v.file}`);
  else if (!fs.existsSync(abs)) ctx.issues.push(`[${id}] file missing: ${v.file}`);
  else return { src: publicRel(abs), trimBefore: 0 };
  return undefined;
}

/** Cues: {"t": source second} → frames from graphic start, {"s": seconds} → frames. Numbers stay as they are. */
function resolveCues(value: unknown, tToRel: (t: number) => number, fps: number): unknown {
  if (Array.isArray(value)) return value.map((v) => resolveCues(v, tToRel, fps));
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const keys = Object.keys(o);
    if (keys.length === 1 && keys[0] === 't' && typeof o.t === 'number') return tToRel(o.t);
    if (keys.length === 1 && keys[0] === 's' && typeof o.s === 'number') return Math.round(o.s * fps);
    return Object.fromEntries(keys.map((k) => [k, resolveCues(o[k], tToRel, fps)]));
  }
  return value;
}

/** Media: every "src" relative to the project folder → path relative to projects/; images get iw/ih. */
async function resolveMedia(id: string, value: unknown, ctx: Ctx): Promise<unknown> {
  if (Array.isArray(value)) return Promise.all(value.map((v) => resolveMedia(id, v, ctx)));
  if (!value || typeof value !== 'object') return value;
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) o[k] = await resolveMedia(id, v, ctx);
  if (typeof o.src === 'string' && !o.src.startsWith('brand:')) {
    const abs = path.resolve(ctx.projectDir, o.src);
    if (!abs.startsWith(PROJECTS)) ctx.issues.push(`[${id}] media must be under projects/: ${o.src}`);
    else if (!fs.existsSync(abs)) ctx.issues.push(`[${id}] media missing: ${o.src}`);
    else {
      o.src = publicRel(abs);
      if (IMAGE_EXT.includes(path.extname(abs).toLowerCase()) && (o.iw === undefined || o.ih === undefined)) {
        const size = await imageSize(abs);
        if (size) {
          o.iw = size.width;
          o.ih = size.height;
        }
      }
    }
  }
  return o;
}

async function sfxDurations(): Promise<Map<string, number>> {
  const dir = path.join(BRAND, 'sfx');
  const m = new Map<string, number>();
  for (const f of listFiles(dir, ['.mp3', '.wav'])) m.set(baseName(f), (await probe(path.join(dir, f))).duration);
  return m;
}

/** All text values of a props structure (without media paths) – for the concrete-things check. */
function collectStrings(v: unknown, key = ''): string[] {
  if (typeof v === 'string') return ['src', 'source', 'from'].includes(key) ? [] : [v];
  if (Array.isArray(v)) return v.flatMap((x) => collectStrings(x, key));
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => collectStrings(x, k));
  return [];
}

/** brand/data/concrete-terms.json: terms you can photograph (a small, deliberately short list). */
function readConcreteTerms(): string[] {
  const f = path.join(BRAND, 'data', 'concrete-terms.json');
  return fs.existsSync(f) ? (readJson<{ terms: string[] }>(f).terms ?? []) : [];
}
