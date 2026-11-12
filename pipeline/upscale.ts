/**
 * Upscales a photo that is too small for the split (Magnific Precision, costs money per image).
 *   npm run upscale -- <slug> --pick <beat>:<nr>          small candidate from visuals.json → work/assets/<beat>.jpg, sets asset + source
 *   npm run upscale -- <slug> --file work/assets/x.jpg     → work/assets/x-up.jpg
 *   [--factor 2]  default: smallest factor that reaches 2400 px width · [--flavor photo|sublime|photo_denoiser]
 *
 * Only the precision upscaler (keeps the content, invents nothing). The credit of the original stays.
 */
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { loadProject, parseCli } from './lib/cli';
import { run } from './lib/exec';
import { log, main } from './lib/log';
import { upscalePrecision } from './lib/magnific';
import { ensureDir, readJson, rootRel, writeJson } from './lib/paths';
import { Visuals } from './schemas/visuals';

const USAGE = 'npm run upscale -- <slug> --pick <beat>:<nr> | --file <path> [--factor 2] [--flavor photo]';
const TARGET_WIDTH = 2400;

main(async () => {
  const { values, positionals } = parseCli(USAGE, {
    pick: { type: 'string' },
    file: { type: 'string' },
    factor: { type: 'string' },
    flavor: { type: 'string', default: 'photo' },
  });
  const { paths } = loadProject(positionals[0], USAGE);
  if (!values.pick === !values.file) throw new Error(`Pass either --pick or --file.\n  ${USAGE}`);
  if (!['photo', 'sublime', 'photo_denoiser'].includes(values.flavor!)) throw new Error('--flavor: photo, sublime or photo_denoiser');

  let src: string;
  let dest: string;
  let onDone: (rel: string) => void = () => undefined;
  if (values.pick) {
    const visFile = path.join(paths.work, 'visuals.json');
    if (!fs.existsSync(visFile)) throw new Error('work/visuals.json missing – run /visuals-plan and `npm run visuals -- <slug> --search` first, or pass --file.');
    const parsed = Visuals.safeParse(readJson(visFile));
    if (!parsed.success) throw new Error(`visuals.json is invalid:\n${z.prettifyError(parsed.error)}`);
    const vis = parsed.data;
    const [id, nr] = values.pick.split(':');
    const beat = vis.beats.find((b) => b.id === id);
    const cand = beat?.candidates[Number(nr) - 1];
    if (!beat || !cand) throw new Error(`Candidate not found: ${values.pick}`);
    if (cand.kind !== 'image') throw new Error('Only photos can be upscaled');
    src = path.resolve(paths.dir, cand.file);
    dest = path.join(ensureDir(paths.assets), `${beat.id}.jpg`);
    onDone = (rel) => {
      beat.asset = rel;
      beat.source = cand.credit ?? beat.source;
      writeJson(visFile, vis);
      log.ok(`${beat.id}: asset = ${rel}${beat.source ? `  (${beat.source})` : ''}`);
    };
  } else {
    src = path.resolve(paths.dir, values.file!);
    dest = src.replace(/\.[^.]+$/, '-up.jpg');
  }
  if (!fs.existsSync(src)) throw new Error(`File not found: ${rootRel(src)}`);

  const width = await imageWidth(src);
  const factor = values.factor ? Number(values.factor) : Math.max(2, Math.ceil(TARGET_WIDTH / width));
  if (!Number.isInteger(factor) || factor < 2 || factor > 16) throw new Error('--factor: whole number 2–16');
  log.step(`Magnific precision ×${factor}: ${rootRel(src)} (${width} px → ${width * factor} px)`);

  const url = await upscalePrecision(src, { factor, flavor: values.flavor as 'photo' });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  const tmp = dest + '.download';
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  // the result may come back as PNG – normalize to a high-quality JPEG
  // keep the paid download if the conversion fails
  const conv = await run('ffmpeg', ['-y', '-v', 'error', '-i', tmp, '-q:v', '2', dest], { quiet: true });
  if (conv.code !== 0 || !fs.existsSync(dest)) throw new Error(`Could not convert the upscaled image – the download is kept at ${rootRel(tmp)}:\n${conv.stderr.slice(0, 400)}`);
  fs.rmSync(tmp);

  const srcMeta = src.replace(/\.[^.]+$/, '.json');
  const meta = fs.existsSync(srcMeta) ? readJson<Record<string, unknown>>(srcMeta) : {};
  writeJson(dest.replace(/\.jpg$/, '.json'), { ...meta, small: undefined, width: await imageWidth(dest), upscaled: { by: 'magnific-precision-v2', factor, from: rootRel(src), at: new Date().toISOString() } });
  const rel = path.relative(paths.dir, dest).split(path.sep).join('/');
  log.ok(`${rel}  → check it at 100 % zoom: edges, text, faces`);
  onDone(rel);
});

async function imageWidth(file: string): Promise<number> {
  const out = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width', '-of', 'csv=p=0', file], { quiet: true });
  const w = Number(out.stdout.trim());
  if (!w) throw new Error(`Could not read the image size of ${rootRel(file)}`);
  return w;
}
