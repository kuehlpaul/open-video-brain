/**
 * Lean ElevenLabs client over the REST API (no SDK → fewer breaking changes).
 * Docs: https://elevenlabs.io/docs/api-reference
 */
import fs from 'node:fs';
import path from 'node:path';
import { env, requireEnv } from './env';
import { log } from './log';

const BASE = 'https://api.elevenlabs.io';

async function call(endpoint: string, init: RequestInit, attempt = 1): Promise<Response> {
  const key = requireEnv('ELEVENLABS_API_KEY', 'Get an API key at elevenlabs.io → Settings → API Keys.');
  const res = await fetch(BASE + endpoint, { ...init, headers: { 'xi-api-key': key, ...(init.headers ?? {}) } });
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    const wait = 2000 * attempt;
    log.warn(`ElevenLabs ${res.status} – retrying in ${wait / 1000}s`);
    await new Promise((r) => setTimeout(r, wait));
    return call(endpoint, init, attempt + 1);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs ${endpoint} → HTTP ${res.status}: ${body.slice(0, 500)}`);
  }
  return res;
}

async function fileBlob(file: string): Promise<Blob> {
  return fs.openAsBlob(file);
}

export type SttWord = {
  text: string;
  start: number;
  end: number;
  type: 'word' | 'spacing' | 'audio_event' | string;
  speaker_id?: string;
  logprob?: number;
};

export async function speechToText(
  file: string,
  opts: { language?: string; keyterms?: string[]; diarize?: boolean; numSpeakers?: number },
): Promise<{ language_code?: string; text: string; words: SttWord[] }> {
  const build = (withKeyterms: boolean) => {
    const form = new FormData();
    form.append('model_id', env('ELEVENLABS_STT_MODEL', 'scribe_v2')!);
    form.append('timestamps_granularity', 'word');
    form.append('tag_audio_events', 'true');
    if (opts.language) form.append('language_code', opts.language);
    if (opts.diarize) form.append('diarize', 'true');
    if (opts.numSpeakers) form.append('num_speakers', String(opts.numSpeakers));
    if (withKeyterms) for (const k of opts.keyterms ?? []) form.append('keyterms', k);
    return form;
  };
  const blob = await fileBlob(file);
  const send = async (withKeyterms: boolean) => {
    const form = build(withKeyterms);
    form.append('file', blob, path.basename(file));
    return call('/v1/speech-to-text', { method: 'POST', body: form });
  };
  let res: Response;
  try {
    res = await send(Boolean(opts.keyterms?.length));
  } catch (err) {
    if (!opts.keyterms?.length) throw err;
    log.warn(`Scribe rejected keyterms, retrying without: ${(err as Error).message.slice(0, 160)}`);
    res = await send(false);
  }
  return (await res.json()) as { language_code?: string; text: string; words: SttWord[] };
}

export type Alignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

export async function textToSpeechWithTimestamps(
  voiceId: string,
  text: string,
  opts: { model: string; languageCode?: string; settings?: Record<string, unknown> },
): Promise<{ audio: Buffer; alignment: Alignment | null }> {
  const body: Record<string, unknown> = { text, model_id: opts.model };
  if (opts.settings) body.voice_settings = opts.settings;
  if (opts.languageCode) body.language_code = opts.languageCode;
  const res = await call(`/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_192`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { audio_base64: string; alignment?: Alignment; normalized_alignment?: Alignment };
  return { audio: Buffer.from(json.audio_base64, 'base64'), alignment: json.alignment ?? json.normalized_alignment ?? null };
}

/** Removes background noise, keeps the voice. Returns audio bytes (mp3). */
export async function audioIsolation(file: string): Promise<Buffer> {
  const form = new FormData();
  form.append('audio', await fileBlob(file), path.basename(file));
  const res = await call('/v1/audio-isolation', { method: 'POST', body: form });
  return Buffer.from(await res.arrayBuffer());
}

/** Voice changer: the performance (timing, emphasis) stays, the voice is replaced. */
export async function speechToSpeech(voiceId: string, file: string, model?: string): Promise<Buffer> {
  const form = new FormData();
  form.append('audio', await fileBlob(file), path.basename(file));
  form.append('model_id', model ?? env('ELEVENLABS_STS_MODEL', 'eleven_multilingual_sts_v2')!);
  const res = await call(`/v1/speech-to-speech/${voiceId}?output_format=mp3_44100_192`, { method: 'POST', body: form });
  return Buffer.from(await res.arrayBuffer());
}

/** Character alignment → words with start/end (seconds). */
export function alignmentToWords(al: Alignment | null): Array<{ text: string; start: number; end: number }> {
  if (!al) return [];
  const words: Array<{ text: string; start: number; end: number }> = [];
  let cur = '';
  let start = 0;
  let end = 0;
  al.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (cur) words.push({ text: cur, start, end });
      cur = '';
      return;
    }
    if (!cur) start = al.character_start_times_seconds[i];
    cur += ch;
    end = al.character_end_times_seconds[i];
  });
  if (cur) words.push({ text: cur, start, end });
  return words;
}

/** Sound effect (ElevenLabs Sound Effects). Length 0.5–30 s, or estimated from the prompt. Returns MP3 bytes. */
export async function soundEffect(prompt: string, opts: { seconds?: number; loop?: boolean; model?: string; influence?: number } = {}): Promise<Buffer> {
  const body: Record<string, unknown> = { text: prompt, prompt_influence: opts.influence ?? 0.5, loop: opts.loop ?? false };
  if (opts.seconds) body.duration_seconds = Math.min(30, Math.max(0.5, opts.seconds));
  if (opts.model) body.model_id = opts.model;
  const res = await call('/v1/sound-generation?output_format=mp3_44100_128', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return Buffer.from(await res.arrayBuffer());
}

/** Music (ElevenLabs Music). Length in ms; instrumental. Returns MP3 bytes. */
export async function composeMusic(prompt: string, lengthMs: number): Promise<Buffer> {
  const res = await call('/v1/music?output_format=mp3_44100_128', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, music_length_ms: Math.round(lengthMs), force_instrumental: true }),
  });
  return Buffer.from(await res.arrayBuffer());
}
