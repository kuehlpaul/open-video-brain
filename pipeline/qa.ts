/**
 * Automatic quality check of a rendered video.
 *   npm run qa -- <slug>              checks output/<slug>.mp4
 *   npm run qa -- <slug> --draft      checks work/render/<slug>-draft.mp4
 *   npm run qa -- <slug> --no-transcript   without the Scribe comparison (free)
 *
 * Checks: technical specs, loudness, black frames, long silence, script coverage,
 * duplicate passages. Creates a contact sheet (work/qa/contact-sheet.jpg) for review.
 * Result: work/qa/report.md + report.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { brand } from '../brand/tokens';
import { loadProject, parseCli } from './lib/cli';
import { speechToText } from './lib/elevenlabs';
import { env } from './lib/env';
import { probe, run, runOrThrow } from './lib/exec';
import { formatTime, log, main } from './lib/log';
import { ensureDir, readJson, rootRel, writeJson } from './lib/paths';
import { lcs, parseScript, tokenize } from './lib/text';
import { Timeline } from './schemas/timeline';

const USAGE = 'npm run qa -- <slug> [--draft] [--no-transcript]';

type Check = { name: string; status: 'pass' | 'warn' | 'fail'; detail: string };

main(async () => {
  const { values, positionals } = parseCli(USAGE, {
    draft: { type: 'boolean', default: false },
    'no-transcript': { type: 'boolean', default: false },
  });
  const { paths, config } = loadProject(positionals[0], USAGE);
  const video = values.draft ? path.join(paths.render, `${config.slug}-draft.mp4`) : path.join(paths.output, `${config.slug}.mp4`);
  if (!fs.existsSync(video)) throw new Error(`Video missing: ${rootRel(video)} – render it first.`);
  const qaDir = ensureDir(paths.qa);
  const checks: Check[] = [];
  const add = (c: Check) => {
    checks.push(c);
    (c.status === 'pass' ? log.ok : c.status === 'warn' ? log.warn : log.error)(`${c.name}: ${c.detail}`);
  };

  log.step(`QA ${rootRel(video)}`);
  const p = await probe(video);
  const timeline = fs.existsSync(paths.timeline) ? Timeline.parse(readJson(paths.timeline)) : null;
  const expected = timeline ? timeline.durationInFrames / timeline.fps : null;
  add({
    name: 'Technical',
    status: p.hasAudio && p.hasVideo ? 'pass' : 'fail',
    detail: `${p.width}×${p.height}, ${p.fps.toFixed(2)} fps, ${formatTime(p.duration)}${p.hasAudio ? '' : ', NO AUDIO'}`,
  });
  if (expected && Math.abs(expected - p.duration) > 0.5) {
    add({ name: 'Duration', status: 'warn', detail: `Timeline ${formatTime(expected)} vs. Video ${formatTime(p.duration)}` });
  }
  if (config.format === 'short' && p.duration > 180) add({ name: 'Short length', status: 'fail', detail: 'Shorts may be at most 3 min long' });

  // loudness
  const ln = await runOrThrow('ffmpeg', ['-hide_banner', '-i', video, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], 'loudness');
  const lj = JSON.parse(ln.stderr.slice(ln.stderr.lastIndexOf('{'), ln.stderr.lastIndexOf('}') + 1)) as Record<string, string>;
  const lufs = Number(lj.input_i);
  const tp = Number(lj.input_tp);
  add({
    name: 'Loudness',
    status: Math.abs(lufs - brand.audio.targetLufs) <= 1.5 && tp <= -0.5 ? 'pass' : 'warn',
    detail: `${lufs.toFixed(1)} LUFS (target ${brand.audio.targetLufs}), True Peak ${tp.toFixed(1)} dBTP`,
  });

  // black frames + silence
  const det = await run('ffmpeg', ['-hide_banner', '-i', video, '-vf', 'blackdetect=d=0.4:pix_th=0.08', '-af', 'silencedetect=n=-45dB:d=1.2', '-f', 'null', '-']);
  const blacks = [...det.stderr.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  // silence in intentionally silent graphic segments (intro, end card without music) is fine
  const quietOk = (timeline?.clips ?? [])
    .filter((c) => c.kind === 'generated' && !c.audioSrc)
    .map((c) => [c.from / timeline!.fps - 0.4, (c.from + c.duration) / timeline!.fps + 0.4]);
  const silences = [...det.stderr.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)]
    .map((m) => [Number(m[1]), Number(m[2])])
    .filter(([a, b]) => !quietOk.some(([qa, qb]) => a >= qa && b <= qb));
  add({
    name: 'Black frames',
    status: blacks.length ? 'warn' : 'pass',
    detail: blacks.length ? blacks.map(([a, b]) => `${formatTime(a)}–${formatTime(b)}`).join(', ') : 'none',
  });
  add({
    name: 'Silence > 1.2 s',
    status: silences.length ? 'warn' : 'pass',
    detail: silences.length ? silences.map(([a, b]) => `${formatTime(a)} (${(b - a).toFixed(1)} s)`).join(', ') : 'none',
  });

  // contact sheet
  const frames = ensureDir(path.join(qaDir, 'frames'));
  for (const f of fs.readdirSync(frames)) fs.rmSync(path.join(frames, f));
  const every = Math.max(1, p.duration / 24);
  await runOrThrow('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', video, '-vf', `fps=1/${every.toFixed(3)},scale=480:-2`, path.join(frames, 'f_%03d.jpg')], 'frames');
  const portrait = p.height > p.width;
  await runOrThrow(
    'ffmpeg',
    ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', '1', '-i', path.join(frames, 'f_%03d.jpg'), '-vf', `tile=${portrait ? '8x3' : '6x4'}:padding=4:margin=4`, '-frames:v', '1', path.join(qaDir, 'contact-sheet.jpg')],
    'contact sheet',
  );
  add({ name: 'Contact sheet', status: 'pass', detail: `${rootRel(path.join(qaDir, 'contact-sheet.jpg'))} (one frame every ${every.toFixed(1)} s)` });

  // script comparison
  if (!values['no-transcript'] && env('ELEVENLABS_API_KEY') && fs.existsSync(paths.script)) {
    // Transcribing costs money: reuse the transcript while the video file is unchanged (same size and modification time)
    const cacheFile = path.join(qaDir, 'output-transcript.json');
    const stat = fs.statSync(video);
    const stamp = `${path.basename(video)}:${stat.size}:${Math.round(stat.mtimeMs)}`;
    type Stt = Awaited<ReturnType<typeof speechToText>>;
    let cached: { stamp: string; stt: Stt } | undefined;
    try {
      cached = fs.existsSync(cacheFile) ? (JSON.parse(fs.readFileSync(cacheFile, 'utf8')) as { stamp: string; stt: Stt }) : undefined;
    } catch {
      cached = undefined;
    }
    let stt: Stt;
    if (cached?.stamp === stamp) {
      stt = cached.stt;
      log.dim('Script comparison: transcript of this render from cache');
    } else {
      const wav = path.join(qaDir, 'output-audio.wav');
      await runOrThrow('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', video, '-vn', '-ac', '1', '-ar', '16000', wav], 'Audio');
      stt = await speechToText(wav, { language: config.language, keyterms: config.keyterms });
      fs.rmSync(wav);
      fs.writeFileSync(cacheFile, JSON.stringify({ stamp, stt }));
    }
    const heard = stt.words.filter((w) => w.type === 'word');
    const heardTokens = heard.map((w) => tokenize(w.text)[0] ?? '').filter(Boolean);
    fs.writeFileSync(path.join(qaDir, 'output-transcript.txt'), stt.text);
    const script = parseScript(fs.readFileSync(paths.script, 'utf8'));
    const missing: string[] = [];
    const window = 400;
    let cursor = 0;
    for (const s of script.sentences) {
      // only search near the last match (script order)
      const from = Math.max(0, cursor - 60);
      // search narrowly first (sentence length ×2 + 30), otherwise the cursor jumps far ahead on repeated words:
      // LCS can match a phrase to a much later occurrence of the same word, and the next sentence is then reported missing
      // (false alarm). Only if nothing fits narrowly, search the wide window (skipped passages).
      let { length, matchedB } = lcs(s.tokens, heardTokens.slice(from, from + s.tokens.length * 2 + 30));
      if (length / s.tokens.length < 0.6) ({ length, matchedB } = lcs(s.tokens, heardTokens.slice(from, from + window)));
      const score = length / s.tokens.length;
      if (score < 0.6) missing.push(`${s.id} (${Math.round(score * 100)} %) "${s.text.slice(0, 70)}"`);
      else cursor = from + (matchedB.at(-1) ?? 0);
    }
    add({
      name: 'Script coverage',
      status: missing.length === 0 ? 'pass' : missing.length <= 2 ? 'warn' : 'fail',
      detail: missing.length ? `${missing.length} sentences missing/different: ${missing.join(' · ')}` : `all ${script.sentences.length} sentences found`,
    });
    // duplicate passages (7-grams)
    const seen = new Map<string, number>();
    const dups: string[] = [];
    for (let i = 0; i + 7 <= heardTokens.length; i++) {
      const g = heardTokens.slice(i, i + 7).join(' ');
      const prev = seen.get(g);
      if (prev !== undefined && i - prev > 7) dups.push(`${formatTime(heard[prev].start)} ≈ ${formatTime(heard[i].start)}: "${g}"`);
      else seen.set(g, i);
    }
    add({ name: 'Duplicate passages', status: dups.length ? 'warn' : 'pass', detail: dups.length ? dups.slice(0, 5).join(' · ') : 'none' });
  } else {
    add({ name: 'Script coverage', status: 'warn', detail: 'skipped (no key, no script or --no-transcript)' });
  }

  const verdict = checks.some((c) => c.status === 'fail') ? 'FAIL' : checks.some((c) => c.status === 'warn') ? 'WARN' : 'PASS';
  writeJson(path.join(qaDir, 'report.json'), { video: rootRel(video), verdict, checks, createdAt: new Date().toISOString() });
  const md = [
    `# QA ${config.slug} – ${verdict}`,
    '',
    `Video: \`${rootRel(video)}\``,
    '',
    '| Check | Status | Detail |',
    '|---|---|---|',
    ...checks.map((c) => `| ${c.name} | ${c.status === 'pass' ? '✅' : c.status === 'warn' ? '⚠️' : '❌'} | ${c.detail.replace(/\|/g, '/')} |`),
    '',
    'Visual check: look at `work/qa/contact-sheet.jpg` (overlays readable? safe areas? framing?).',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(qaDir, 'report.md'), md);
  log.step(`QA result: ${verdict} → work/qa/report.md`);
});
