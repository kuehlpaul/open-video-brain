/**
 * Energy-checked seams: transcript word times are often off by a few hundredths of a second. A cut exactly
 * there clips the onset or the tail of a word and sounds choppy (odd pitch glitches in the voice). So every
 * cut edge moves to the quietest nearby frame, without running into a neighboring word.
 */
import fs from 'node:fs';
import type { Word } from '../schemas/transcript';

export type Level = (t: number, win?: number) => number;

/** Level (dBFS, RMS) of a 16-bit PCM WAV at time t; reads only the needed chunk. */
export function wavLevel(file: string): Level | undefined {
  if (!fs.existsSync(file)) return undefined;
  const fd = fs.openSync(file, 'r');
  const head = Buffer.alloc(4096);
  fs.readSync(fd, head, 0, 4096, 0);
  if (head.toString('ascii', 0, 4) !== 'RIFF') return undefined;
  let pos = 12;
  let channels = 1;
  let rate = 48000;
  let bits = 16;
  let dataStart = -1;
  while (pos + 8 < head.length) {
    const id = head.toString('ascii', pos, pos + 4);
    const size = head.readUInt32LE(pos + 4);
    if (id === 'fmt ') {
      channels = head.readUInt16LE(pos + 10);
      rate = head.readUInt32LE(pos + 12);
      bits = head.readUInt16LE(pos + 22);
    }
    if (id === 'data') {
      dataStart = pos + 8;
      break;
    }
    pos += 8 + size + (size % 2);
  }
  if (dataStart < 0 || bits !== 16) return undefined;
  const frameBytes = channels * 2;
  return (t: number, win = 0.02) => {
    const n = Math.max(1, Math.round(win * rate));
    const start = Math.max(0, Math.round((t - win / 2) * rate));
    const buf = Buffer.alloc(n * frameBytes);
    const got = fs.readSync(fd, buf, 0, buf.length, dataStart + start * frameBytes);
    let sum = 0;
    const count = Math.floor(got / 2);
    for (let i = 0; i < count; i++) {
      const v = buf.readInt16LE(i * 2) / 32768;
      sum += v * v;
    }
    return 20 * Math.log10(Math.sqrt(sum / Math.max(1, count)) + 1e-9);
  };
}

/**
 * Moves cut edges to the quietest frame. In points may move up to 0.2 s earlier (save the onset) and 0.04 s later,
 * out points 0.04 s earlier to 0.2 s later (save the tail) – never past the end of the previous or the start of the next word.
 */
export function snapSeams(ranges: Array<[number, number]>, words: Word[], level: Level, fps: number): Array<[number, number]> {
  const ws = [...words].sort((a, b) => a.start - b.start);
  // nearest frame that is "quiet enough" (≤ max(quietest + 3 dB, −48 dB)) – shift as little as needed, pacing stays
  const best = (from: number, to: number, orig: number) => {
    const cand: Array<{ t: number; d: number }> = [];
    for (let f = Math.ceil(from * fps); f <= Math.floor(to * fps); f++) cand.push({ t: f / fps, d: level(f / fps) });
    const o = Math.round(orig * fps) / fps;
    if (!cand.length) return o;
    const min = Math.min(...cand.map((c) => c.d));
    const ok = cand.filter((c) => c.d <= Math.max(min + 3, -48));
    ok.sort((x, y) => Math.abs(x.t - orig) - Math.abs(y.t - orig));
    return ok[0].t;
  };
  return ranges.map(([a, b]) => {
    const prev = ws.filter((w) => w.start < a - 0.02).pop();
    const next = ws.find((w) => w.end > b + 0.02);
    const a2 = best(Math.max(a - 0.2, prev ? prev.end + 0.01 : -Infinity), a + 0.04, a);
    const b2 = best(b - 0.04, Math.min(b + 0.2, next ? next.start - 0.01 : Infinity), b);
    return [a2, Math.max(b2, a2 + 3 / fps)] as [number, number];
  });
}
