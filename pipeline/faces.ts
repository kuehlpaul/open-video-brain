/**
 * Face track per footage clip (macOS Vision) → work/faces/<clip>.json in the source project.
 *   npm run faces -- <slug> [--fps 2] [--force]
 *
 * build-timeline uses the track in 9:16: every cut gets its own crop (focusX)
 * so the speaker stays centered even when moving.
 * Free, local; needs macOS with the Xcode Command Line Tools (swiftc).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProject, parseCli } from './lib/cli';
import { runOrThrow } from './lib/exec';
import { log, main } from './lib/log';
import { baseName, ensureDir, fromPublicRel, readJson, writeJson } from './lib/paths';
import { FootageIndex } from './schemas/transcript';

const USAGE = 'npm run faces -- <slug> [--fps 2] [--force]';

main(async () => {
  const { values, positionals } = parseCli(USAGE, { fps: { type: 'string' }, force: { type: 'boolean', default: false } });
  const { source } = loadProject(positionals[0], USAGE);
  const fps = values.fps ? Number(values.fps) : 2;
  const outDir = ensureDir(path.join(source.dir, 'work', 'faces'));
  const bin = path.join(os.tmpdir(), 'ovb-face-detect');
  if (!fs.existsSync(bin)) await runOrThrow('swiftc', ['-O', path.join(path.dirname(fileURLToPath(import.meta.url)), 'tools', 'face.swift'), '-o', bin], 'swiftc face.swift');
  for (const f of FootageIndex.parse(readJson(source.footageIndex))) {
    const out = path.join(outDir, `${baseName(f.clip)}.json`);
    if (fs.existsSync(out) && !values.force) {
      log.info(`${f.clip}: face track exists (--force to recompute)`);
      continue;
    }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ovb-faces-'));
    log.info(`${f.clip}: extracting frames (${fps}/s) …`);
    await runOrThrow('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', fromPublicRel(f.src), '-vf', `fps=${fps},scale=640:-2`, '-q:v', '5', path.join(tmp, '%06d.jpg')], 'ffmpeg');
    const files = fs.readdirSync(tmp).filter((x) => x.endsWith('.jpg')).sort();
    const samples: Array<[number, number, number, number]> = [];
    for (let i = 0; i < files.length; i += 400) {
      const res = await runOrThrow(bin, files.slice(i, i + 400).map((x) => path.join(tmp, x)), 'face detection');
      for (const line of res.stdout.trim().split('\n')) {
        const [file, cx, cy, h] = line.split(' ');
        if (cx === 'none' || !file) continue;
        const k = Number(path.basename(file, '.jpg')) - 1;
        samples.push([Math.round((k / fps) * 100) / 100, Number(cx), Number(cy), Number(h)]);
      }
    }
    fs.rmSync(tmp, { recursive: true, force: true });
    writeJson(out, { clip: f.clip, fps, note: '[second, center x, center y, height] as fractions of the frame', samples });
    log.ok(`${f.clip}: ${samples.length}/${files.length} frames with a face → ${path.relative(source.dir, out)}`);
  }
});
