/**
 * Magnific (formerly Freepik) Precision Upscaler V2 – raises resolution while keeping the image content.
 * Deliberately NOT the "creative" upscaler: that one invents detail, which is not acceptable for photos
 * of real things (golden rule 7).
 * Docs: https://docs.magnific.com/api-reference/image-upscaler-precision-v2/overview
 */
import fs from 'node:fs';
import { env, requireEnv } from './env';
import { log } from './log';

const ENDPOINT = '/v1/ai/image-upscaler-precision-v2';

type Task = { data?: { task_id?: string; status?: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | string; generated?: string[]; error?: string } };

export async function upscalePrecision(file: string, opts: { factor: number; flavor?: 'photo' | 'sublime' | 'photo_denoiser' }): Promise<string> {
  const key = requireEnv('MAGNIFIC_API_KEY', 'Get a key at magnific.com/api (formerly Freepik API).');
  const base = env('MAGNIFIC_API_BASE', 'https://api.magnific.com')!;
  const headers = { 'x-magnific-api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' };
  const body = { image: fs.readFileSync(file).toString('base64'), scale_factor: opts.factor, flavor: opts.flavor ?? 'photo' };

  const res = await fetch(base + ENDPOINT, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Magnific upscale → HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const id = ((await res.json()) as Task).data?.task_id;
  if (!id) throw new Error('Magnific: no task_id in the response');

  const started = Date.now();
  let last = '';
  for (;;) {
    if (Date.now() - started > 10 * 60_000) throw new Error('Magnific: timed out after 600s');
    await new Promise((r) => setTimeout(r, 3000));
    const st = await fetch(`${base}${ENDPOINT}/${id}`, { headers });
    if (!st.ok) {
      if (st.status >= 500 || st.status === 429) continue;
      throw new Error(`Magnific status → HTTP ${st.status}: ${(await st.text()).slice(0, 300)}`);
    }
    const d = ((await st.json()) as Task).data ?? {};
    if (d.status === 'COMPLETED') {
      const url = d.generated?.[0];
      if (!url) throw new Error('Magnific: task completed without an image URL');
      return url;
    }
    if (d.status === 'FAILED') throw new Error(`Magnific: task failed${d.error ? ` – ${d.error}` : ''}`);
    if (d.status && d.status !== last) {
      log.dim(`Magnific: ${d.status}`);
      last = d.status;
    }
  }
}
