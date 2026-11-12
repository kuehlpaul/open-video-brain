/**
 * Generates an image, a video clip or a sound with AI and stores it in the project.
 *   npm run generate -- <slug> --type image --prompt "City skyline at night, drone shot" --name skyline
 *   npm run generate -- <slug> --type image --provider bfl --prompt "..." --name skyline        (FLUX via Black Forest Labs)
 *   npm run generate -- <slug> --type video --provider higgsfield --model <path> --image work/assets/skyline.jpg --prompt "slow push-in" --name skyline-push
 *   npm run generate -- <slug> --type video --provider atlas --model <model-id> --prompt "..." --name intro-broll --input '{"duration":5}'
 *   npm run generate -- <slug> --type audio --prompt "heavy wooden door creaks open" --seconds 3 --name door
 *
 * Providers: fal (default for image/video), bfl, higgsfield, atlas, elevenlabs (default for audio).
 * Overview with keys and default models: npm run generate -- --providers
 * Model via --model or .env (<PROVIDER>_IMAGE_MODEL / _VIDEO_MODEL / _AUDIO_MODEL). Model-specific
 * parameters via --input as JSON. Result: work/assets/<name>.<ext> + <name>.json (provider, model, prompt).
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadProject, parseCli } from './lib/cli';
import { env, maskSecret } from './lib/env';
import { GEN_PROVIDERS, PROVIDER_INFO, defaultModel, generate, type GenProvider, type GenType } from './lib/generators';
import { log, main } from './lib/log';
import { ensureDir, rootRel, writeJson } from './lib/paths';

const USAGE =
  'npm run generate -- <slug> --type image|video|audio --prompt "..." --name <filename> [--provider fal|bfl|higgsfield|atlas|elevenlabs] [--model <id>] [--image <path|url>] [--aspect 16:9] [--seconds <n>] [--loop] [--input \'{json}\']\n' +
  '  npm run generate -- --providers   (which providers are set up)';

main(async () => {
  const { values, positionals } = parseCli(USAGE, {
    type: { type: 'string', default: 'image' },
    provider: { type: 'string' },
    prompt: { type: 'string' },
    name: { type: 'string' },
    model: { type: 'string' },
    image: { type: 'string' },
    aspect: { type: 'string' },
    seconds: { type: 'string' },
    loop: { type: 'boolean', default: false },
    input: { type: 'string' },
    providers: { type: 'boolean', default: false },
  });
  if (values.providers) return listProviders();

  const { paths, config } = loadProject(positionals[0], USAGE);
  if (!values.prompt) throw new Error(`--prompt missing.\n  ${USAGE}`);
  if (!values.name || !/^[a-z0-9-]+$/.test(values.name)) throw new Error('--name missing or contains characters other than a-z, 0-9, -');
  if (!['image', 'video', 'audio'].includes(values.type!)) throw new Error(`--type must be image, video or audio`);
  const type = values.type as GenType;
  // GEN_PROVIDER is the default for whatever it can do: .env.example sets it to fal, which has no audio model
  // configured out of the box – audio then falls back to ElevenLabs instead of failing.
  const fromEnv = (env('GEN_PROVIDER') || undefined) as GenProvider | undefined;
  const envFits = fromEnv && (!GEN_PROVIDERS.includes(fromEnv) || (PROVIDER_INFO[fromEnv].types.includes(type) && Boolean(values.model ?? defaultModel(fromEnv, type))));
  const provider = (values.provider ?? (envFits ? fromEnv : type === 'audio' ? 'elevenlabs' : 'fal')) as GenProvider;
  if (!GEN_PROVIDERS.includes(provider)) throw new Error(`Unknown provider "${provider}" (${GEN_PROVIDERS.join(', ')})`);
  const info = PROVIDER_INFO[provider];
  if (!info.types.includes(type)) {
    const alt = GEN_PROVIDERS.filter((p) => PROVIDER_INFO[p].types.includes(type));
    throw new Error(`${provider} cannot generate ${type}. Providers for ${type}: ${alt.join(', ')}`);
  }
  const model = values.model ?? defaultModel(provider, type);
  if (!model) throw new Error(`No model for ${provider} ${type}: pass --model or set ${info.modelEnv[type]} in .env (model IDs: see the provider's model page).`);

  const aspect = values.aspect ?? (config.format === 'short' ? '9:16' : '16:9');
  const seconds = values.seconds ? Number(values.seconds) : undefined;
  const extra = values.input ? (JSON.parse(values.input) as Record<string, unknown>) : {};

  log.step(`${provider} ${model} (${type})`);
  const result = await generate({ provider, type, model, prompt: values.prompt, aspect, image: values.image, seconds, loop: values.loop, extra, projectDir: paths.dir });

  let bytes: Buffer;
  let ext: string;
  if ('bytes' in result) ({ bytes, ext } = result);
  else {
    const res = await fetch(result.url);
    if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
    bytes = Buffer.from(await res.arrayBuffer());
    ext = extFrom(res.headers.get('content-type'), result.url, type);
  }
  const out = path.join(ensureDir(paths.assets), `${values.name}${ext}`);
  fs.writeFileSync(out, bytes);
  writeJson(path.join(paths.assets, `${values.name}.json`), {
    generated: true,
    provider,
    model,
    type,
    prompt: values.prompt,
    aspect: type === 'audio' ? undefined : aspect,
    seconds,
    image: values.image && !/^https?:\/\//.test(values.image) ? values.image : values.image ? '(URL)' : undefined,
    input: Object.keys(extra).length ? extra : undefined,
    createdAt: new Date().toISOString(),
  });
  log.ok(`${rootRel(out)}  → use in edl.json as "work/assets/${values.name}${ext}"`);
});

function listProviders() {
  log.step('Generation providers');
  for (const p of GEN_PROVIDERS) {
    const info = PROVIDER_INFO[p];
    const key = env(info.key);
    const models = info.types.map((t) => `${t}: ${defaultModel(p, t) ?? `(set ${info.modelEnv[t]} or --model)`}`).join(' · ');
    (key ? log.ok : log.dim)(`${p.padEnd(11)} ${key ? maskSecret(key) : `${info.key} empty`}  –  ${models}`);
  }
}

function extFrom(contentType: string | null, url: string, type: GenType): string {
  const fromUrl = path.extname(new URL(url).pathname).toLowerCase();
  if (/^\.(png|jpe?g|webp|mp4|mov|webm|mp3|wav|ogg|flac|m4a)$/.test(fromUrl)) return fromUrl === '.jpeg' ? '.jpg' : fromUrl;
  if (contentType?.includes('png')) return '.png';
  if (contentType?.includes('webp')) return '.webp';
  if (contentType?.includes('jpeg')) return '.jpg';
  if (contentType?.includes('wav')) return '.wav';
  if (contentType?.includes('mpeg') && type === 'audio') return '.mp3';
  return type === 'video' ? '.mp4' : type === 'audio' ? '.mp3' : '.png';
}
