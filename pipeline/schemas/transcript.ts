import { z } from 'zod';

export const Word = z.object({
  text: z.string(),
  /** seconds in the source file */
  start: z.number(),
  end: z.number(),
  type: z.enum(['word', 'audio_event']).default('word'),
  speaker: z.string().optional(),
  logprob: z.number().optional(),
});
export type Word = z.infer<typeof Word>;

/** work/transcripts/<clip-basename>.json */
export const Transcript = z.object({
  clip: z.string(),
  language: z.string().optional(),
  model: z.string(),
  createdAt: z.string(),
  words: z.array(Word),
});
export type Transcript = z.infer<typeof Transcript>;

/** work/footage.json */
export const FootageInfo = z.object({
  clip: z.string(),
  /** relative to projects/ (= Remotion public dir) */
  src: z.string(),
  duration: z.number(),
  fps: z.number(),
  width: z.number(),
  height: z.number(),
  hasAudio: z.boolean(),
  codec: z.string().optional(),
});
export type FootageInfo = z.infer<typeof FootageInfo>;
export const FootageIndex = z.array(FootageInfo);

/** work/voice/manifest.json */
export const VoiceManifestEntry = z.object({
  id: z.string(),
  /** relative to projects/ */
  src: z.string(),
  duration: z.number(),
  text: z.string(),
  voice: z.string(),
  hash: z.string(),
  words: z.array(z.object({ text: z.string(), start: z.number(), end: z.number() })),
});
export const VoiceManifest = z.record(z.string(), VoiceManifestEntry);
export type VoiceManifest = z.infer<typeof VoiceManifest>;
