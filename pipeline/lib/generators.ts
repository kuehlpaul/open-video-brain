/**
 * AI generation providers for `npm run generate`. Every provider takes a model + input and returns the
 * URL (or the bytes) of the result. All of them cost money per generation.
 *
 *   fal         – one key, many image/video/audio models          FAL_KEY                       (lib/fal.ts)
 *   bfl         – Black Forest Labs, FLUX images                  BFL_API_KEY                   https://docs.bfl.ai
 *   higgsfield  – Higgsfield, images (SOUL) + video (Kling, Seedance, Wan …)
 *                                                                 HIGGSFIELD_API_KEY (id:secret) https://docs.higgsfield.ai
 *   atlas       – Atlas Cloud, images + video (Kling, Veo, Seedance, Wan …)
 *                                                                 ATLAS_API_KEY                 https://www.atlascloud.ai/docs
 *   elevenlabs  – sound effects (text → SFX)                      ELEVENLABS_API_KEY            (lib/elevenlabs.ts)
 */
import fs from 'node:fs';
import path from 'node:path';
import { soundEffect } from './elevenlabs';
import { env, requireEnv } from './env';
import { falRun, findMediaUrl } from './fal';
import { log } from './log';

export const GEN_PROVIDERS = ['fal', 'bfl', 'higgsfield', 'atlas', 'elevenlabs'] as const;
export type GenProvider = (typeof GEN_PROVIDERS)[number];
export type GenType = 'image' | 'video' | 'audio';

export type GenRequest = {
  provider: GenProvider;
  type: GenType;
  model: string;
  prompt: string;
  /** 16:9, 9:16, 1:1, 4:3, 3:4 */
  aspect: string;
  /** Start image for image-to-video / image editing: URL or path relative to the project folder */
  image?: string;
  /** Audio only: length in seconds */
  seconds?: number;
  /** Audio only: seamless loop */
  loop?: boolean;
  /** Model-specific parameters, merged last (they win) */
  extra: Record<string, unknown>;
  projectDir: string;
};

export type GenResult = { url: string } | { bytes: Buffer; ext: string };

/** What each provider can do and which .env variable holds its default model. */
export const PROVIDER_INFO: Record<GenProvider, { types: GenType[]; key: string; modelEnv: Partial<Record<GenType, string>>; defaults: Partial<Record<GenType, string>> }> = {
  fal: { types: ['image', 'video', 'audio'], key: 'FAL_KEY', modelEnv: { image: 'FAL_IMAGE_MODEL', video: 'FAL_VIDEO_MODEL', audio: 'FAL_AUDIO_MODEL' }, defaults: { image: 'fal-ai/flux/dev' } },
  bfl: { types: ['image'], key: 'BFL_API_KEY', modelEnv: { image: 'BFL_IMAGE_MODEL' }, defaults: { image: 'flux-2-pro' } },
  higgsfield: { types: ['image', 'video'], key: 'HIGGSFIELD_API_KEY', modelEnv: { image: 'HIGGSFIELD_IMAGE_MODEL', video: 'HIGGSFIELD_VIDEO_MODEL' }, defaults: { image: 'higgsfield-ai/soul/standard' } },
  atlas: { types: ['image', 'video'], key: 'ATLAS_API_KEY', modelEnv: { image: 'ATLAS_IMAGE_MODEL', video: 'ATLAS_VIDEO_MODEL' }, defaults: {} },
  elevenlabs: { types: ['audio'], key: 'ELEVENLABS_API_KEY', modelEnv: { audio: 'ELEVENLABS_SFX_MODEL' }, defaults: { audio: 'eleven_text_to_sound_v2' } },
};

export function defaultModel(provider: GenProvider, type: GenType): string | undefined {
  const info = PROVIDER_INFO[provider];
  const name = info.modelEnv[type];
  return (name ? env(name) : undefined) ?? info.defaults[type];
}

export async function generate(req: GenRequest): Promise<GenResult> {
  if (!PROVIDER_INFO[req.provider].types.includes(req.type)) {
    throw new Error(`${req.provider} cannot generate ${req.type} (only ${PROVIDER_INFO[req.provider].types.join(', ')})`);
  }
  switch (req.provider) {
    case 'fal':
      return runFal(req);
    case 'bfl':
      return runBfl(req);
    case 'higgsfield':
      return runHiggsfield(req);
    case 'atlas':
      return runAtlas(req);
    case 'elevenlabs':
      return { bytes: await soundEffect(req.prompt, { seconds: req.seconds, loop: req.loop, model: req.model }), ext: '.mp3' };
  }
}

// ── fal.ai ──────────────────────────────────────────────────────────────────────────────

async function runFal(req: GenRequest): Promise<GenResult> {
  // Flux models expect image_size instead of aspect_ratio
  const fluxSize: Record<string, string> = { '16:9': 'landscape_16_9', '9:16': 'portrait_16_9', '1:1': 'square_hd', '4:3': 'landscape_4_3', '3:4': 'portrait_4_3' };
  const input: Record<string, unknown> = { prompt: req.prompt };
  if (req.type === 'audio') {
    if (req.seconds) input.seconds_total = req.seconds;
  } else if (req.model.includes('flux')) input.image_size = fluxSize[req.aspect] ?? 'landscape_16_9';
  else input.aspect_ratio = req.aspect;
  if (req.image) input.image_url = imageAsUrl(req.image, req.projectDir);
  const result = await falRun(req.model, { ...input, ...req.extra });
  const url = findMediaUrl(result);
  if (!url) throw new Error(`fal: no media URL in the result: ${JSON.stringify(result).slice(0, 300)}`);
  return { url };
}

// ── Black Forest Labs (FLUX) ────────────────────────────────────────────────────────────
// POST https://api.bfl.ai/v1/<model> (header x-key) → { id, polling_url }; GET polling_url → { status, result.sample }.
// result.sample is a signed URL that expires after 10 minutes – download right away.

/** FLUX.2 / FLUX 1.1 take width/height (multiples of 16); Ultra and Kontext take aspect_ratio. */
const BFL_SIZES: Record<string, [number, number]> = { '16:9': [2048, 1152], '9:16': [1152, 2048], '1:1': [1440, 1440], '4:3': [1664, 1248], '3:4': [1248, 1664] };

async function runBfl(req: GenRequest): Promise<GenResult> {
  const key = requireEnv('BFL_API_KEY', 'Get a key at dashboard.bfl.ai → API Keys.');
  const base = env('BFL_API_BASE', 'https://api.bfl.ai')!;
  const input: Record<string, unknown> = { prompt: req.prompt, output_format: 'jpeg' };
  if (/ultra|kontext/.test(req.model)) input.aspect_ratio = req.aspect;
  else {
    const [width, height] = BFL_SIZES[req.aspect] ?? BFL_SIZES['16:9'];
    Object.assign(input, { width, height });
  }
  if (req.image) input.input_image = imageAsUrl(req.image, req.projectDir);
  const headers = { 'x-key': key, 'Content-Type': 'application/json', accept: 'application/json' };
  const job = await postJson<{ id: string; polling_url: string }>(`${base}/v1/${req.model}`, { ...input, ...req.extra }, headers, 'BFL');
  const done = await poll('BFL', job.polling_url, { 'x-key': key }, (r: any) => {
    if (r.status === 'Ready') return { done: r.result?.sample as string };
    if (/error|failed|moderated|not found/i.test(r.status ?? '')) return { error: `${r.status}${r.details ? ` – ${JSON.stringify(r.details)}` : ''}` };
    return { state: r.status };
  });
  return { url: done };
}

// ── Higgsfield ─────────────────────────────────────────────────────────────────────────
// POST https://api.higgsfield.ai/<model-path> (Authorization: Key <id>:<secret>) → { request_id, status_url };
// GET status_url → { status: queued|in_progress|completed|failed|nsfw|canceled, images[].url | video.url }.
// Field names differ per model (docs.higgsfield.ai → model page); pass extra fields with --input.

async function runHiggsfield(req: GenRequest): Promise<GenResult> {
  const key = requireEnv('HIGGSFIELD_API_KEY', 'Create a key at console.higgsfield.ai, enter it as <key id>:<key secret>.');
  const headers = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' };
  const input: Record<string, unknown> = { prompt: req.prompt, aspect_ratio: req.aspect };
  if (req.type === 'image') input.resolution = '1080p';
  if (req.image) input.image_url = /^https?:\/\//.test(req.image) ? req.image : await higgsfieldUpload(path.resolve(req.projectDir, req.image), headers);
  const job = await postJson<{ request_id: string; status_url: string }>(`${HIGGSFIELD}/${req.model.replace(/^\//, '')}`, { ...input, ...req.extra }, headers, 'Higgsfield');
  const url = await poll('Higgsfield', job.status_url, headers, (r: any) => {
    if (r.status === 'completed') {
      const u = findMediaUrl(r);
      return u ? { done: u } : { error: `no media URL in the result: ${JSON.stringify(r).slice(0, 300)}` };
    }
    if (['failed', 'nsfw', 'canceled'].includes(r.status)) return { error: `${r.status}${r.error ? ` – ${r.error}` : ''}` };
    return { state: r.status };
  });
  return { url };
}

const HIGGSFIELD = 'https://api.higgsfield.ai';

/** Local file → presigned upload → public_url (valid for generation requests). */
async function higgsfieldUpload(file: string, headers: Record<string, string>): Promise<string> {
  const content_type = mimeOf(file);
  const slot = await postJson<{ public_url: string; upload_url: string; upload_headers?: Record<string, string> }>(
    `${HIGGSFIELD}/files/generate-upload-url`, { content_type }, headers, 'Higgsfield upload',
  );
  // no Higgsfield credentials to the presigned storage URL
  const put = await fetch(slot.upload_url, { method: 'PUT', headers: slot.upload_headers ?? { 'Content-Type': content_type }, body: new Uint8Array(fs.readFileSync(file)) });
  if (!put.ok) throw new Error(`Higgsfield upload → HTTP ${put.status}: ${(await put.text()).slice(0, 300)}`);
  return slot.public_url;
}

// ── Atlas Cloud ────────────────────────────────────────────────────────────────────────
// POST https://api.atlascloud.ai/api/v1/model/generateImage|generateVideo (Bearer) → { data: { id } };
// GET  …/model/prediction/<id> → { data: { status: processing|completed|succeeded|failed, outputs[], error } }.
// Local start images are uploaded first (…/model/uploadMedia). Parameters differ per model (model page).

const ATLAS = 'https://api.atlascloud.ai/api/v1/model';

async function runAtlas(req: GenRequest): Promise<GenResult> {
  const key = requireEnv('ATLAS_API_KEY', 'Get a key at atlascloud.ai → Console → API Keys.');
  const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const input: Record<string, unknown> = { model: req.model, prompt: req.prompt, aspect_ratio: req.aspect };
  if (req.image) input.image_url = /^https?:\/\//.test(req.image) ? req.image : await atlasUpload(path.resolve(req.projectDir, req.image), key);
  const endpoint = req.type === 'video' ? 'generateVideo' : 'generateImage';
  const job = await postJson<{ data?: { id?: string } }>(`${ATLAS}/${endpoint}`, { ...input, ...req.extra }, headers, 'Atlas');
  const id = job.data?.id;
  if (!id) throw new Error(`Atlas: no prediction ID in the response: ${JSON.stringify(job).slice(0, 300)}`);
  const url = await poll('Atlas', `${ATLAS}/prediction/${id}`, headers, (r: any) => {
    const d = r.data ?? {};
    if (d.status === 'completed' || d.status === 'succeeded') {
      const out = d.outputs?.[0];
      return typeof out === 'string' ? { done: out } : { error: `no output in the result: ${JSON.stringify(d).slice(0, 300)}` };
    }
    if (d.status === 'failed') return { error: String(d.error ?? 'failed') };
    return { state: d.status };
  });
  return { url };
}

async function atlasUpload(file: string, key: string): Promise<string> {
  const form = new FormData();
  form.append('file', await fs.openAsBlob(file), path.basename(file));
  const res = await fetch(`${ATLAS}/uploadMedia`, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
  if (!res.ok) throw new Error(`Atlas upload → HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = (await res.json()) as { url?: string; data?: { url?: string; download_url?: string } };
  const url = body.data?.download_url ?? body.data?.url ?? body.url;
  if (!url) throw new Error(`Atlas upload: no URL in the response: ${JSON.stringify(body).slice(0, 300)}`);
  return url;
}

// ── helpers ────────────────────────────────────────────────────────────────────────────

async function postJson<T>(url: string, body: unknown, headers: Record<string, string>, who: string): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${who} ${new URL(url).pathname} → HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);
  return (await res.json()) as T;
}

type PollStep = { done: string } | { error: string } | { state?: string };

async function poll(who: string, url: string, headers: Record<string, string>, check: (r: unknown) => PollStep, timeoutMs = 15 * 60_000): Promise<string> {
  const started = Date.now();
  let last = '';
  for (;;) {
    if (Date.now() - started > timeoutMs) throw new Error(`${who}: timed out after ${timeoutMs / 1000}s`);
    await new Promise((r) => setTimeout(r, 2500));
    const res = await fetch(url, { headers });
    if (!res.ok) {
      if (res.status >= 500 || res.status === 429) continue;
      throw new Error(`${who} status → HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const step = check(await res.json());
    if ('done' in step) return step.done;
    if ('error' in step) throw new Error(`${who}: ${step.error}`);
    if (step.state && step.state !== last) {
      log.dim(`${who}: ${step.state}`);
      last = step.state;
    }
  }
}

/** URL or data URI (fal and BFL accept base64 data URIs). */
function imageAsUrl(src: string, projectDir: string): string {
  if (/^https?:\/\//.test(src)) return src;
  const abs = path.resolve(projectDir, src);
  return `data:${mimeOf(abs)};base64,${fs.readFileSync(abs).toString('base64')}`;
}

function mimeOf(file: string): string {
  return file.endsWith('.png') ? 'image/png' : file.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
}
