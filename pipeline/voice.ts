/**
 * Generates the voice inserts from edl.json with the voice clone (e.g. narration over a card).
 *   npm run voice -- <slug> [--force]
 *
 * Cached by hash(text + voice + model): unchanged inserts cost nothing.
 * Refuses unless brand/voices.json has consent=true for the voice.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { loadProject, parseCli } from './lib/cli';
import { alignmentToWords, textToSpeechWithTimestamps } from './lib/elevenlabs';
import { env, envNumber } from './lib/env';
import { probe } from './lib/exec';
import { log, main } from './lib/log';
import { BRAND, ensureDir, publicRel, readJson, writeJson } from './lib/paths';
import { Edl } from './schemas/edl';
import { VoiceManifest } from './schemas/transcript';

const USAGE = 'npm run voice -- <slug> [--force]';

const Voices = z.object({
  voices: z.record(
    z.string(),
    z.object({
      name: z.string(),
      voiceId: z.string(),
      consent: z.boolean(),
      model: z.string().optional(),
      settings: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
});

main(async () => {
  const { values, positionals } = parseCli(USAGE, { force: { type: 'boolean', default: false } });
  const { paths, config } = loadProject(positionals[0], USAGE);
  const edl = Edl.parse(readJson(paths.edl));
  if (!edl.voiceInserts.length) {
    log.info('No voiceInserts in edl.json.');
    return;
  }
  const voices = Voices.parse(readJson(path.join(BRAND, 'voices.json'))).voices;
  const manifest: VoiceManifest = fs.existsSync(paths.voiceManifest) ? VoiceManifest.parse(readJson(paths.voiceManifest)) : {};
  ensureDir(paths.voice);

  const maxChars = envNumber('MAX_TTS_CHARS_PER_RUN', 6000);
  let chars = 0;
  log.step(`Voice-Inserts (${edl.voiceInserts.length})`);
  for (const ins of edl.voiceInserts) {
    const v = voices[ins.voice];
    if (!v) throw new Error(`Voice "${ins.voice}" missing in brand/voices.json`);
    if (!v.consent) throw new Error(`"${ins.voice}" has consent=false in brand/voices.json. No voice clone without consent.`);
    if (!v.voiceId) throw new Error(`"${ins.voice}" has no voiceId (brand/voices.json).`);
    // || instead of ??: brand/voices.json ships with "model": "", which must fall through to the default
    const model = ins.model || v.model || env('ELEVENLABS_TTS_MODEL', 'eleven_multilingual_v2')!;
    const hash = crypto.createHash('sha1').update([ins.text, v.voiceId, model, JSON.stringify(v.settings ?? {})].join('|')).digest('hex').slice(0, 10);
    const existing = manifest[ins.id];
    if (!values.force && existing?.hash === hash && fs.existsSync(path.join(paths.voice, path.basename(existing.src)))) {
      log.dim(`${ins.id}: unchanged (cache)`);
      continue;
    }
    chars += ins.text.length;
    if (chars > maxChars) throw new Error(`More than ${maxChars} TTS characters in one run (MAX_TTS_CHARS_PER_RUN). Raise it deliberately if intended.`);
    const { audio, alignment } = await textToSpeechWithTimestamps(v.voiceId, ins.text, {
      model,
      languageCode: config.language,
      settings: v.settings,
    });
    const file = path.join(paths.voice, `${ins.id}-${hash}.mp3`);
    fs.writeFileSync(file, audio);
    const p = await probe(file);
    manifest[ins.id] = {
      id: ins.id,
      src: publicRel(file),
      duration: p.duration,
      text: ins.text,
      voice: ins.voice,
      hash,
      words: alignmentToWords(alignment),
    };
    log.ok(`${ins.id}: ${p.duration.toFixed(2)} s`);
  }
  writeJson(paths.voiceManifest, manifest);
  log.ok('work/voice/manifest.json updated');
});
