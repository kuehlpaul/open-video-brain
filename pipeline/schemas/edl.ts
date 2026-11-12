/**
 * EDL = the editing decisions. Claude only writes this file (work/edl.json).
 * Times are in seconds. Source times map 1:1 to the transcript timestamps.
 * build-timeline.ts turns it into the frame-accurate timeline.json.
 */
import { z } from 'zod';
import { Format } from './project';

/**
 * When an overlay/B-roll starts:
 *  - { seg, t }      at source time t (seconds, per transcript) in footage segment `seg`
 *  - { seg, offset } offset seconds after the start of segment `seg` in the finished video
 *  - { out }         absolute second in the finished video
 */
export const Anchor = z.union([
  z.strictObject({ seg: z.string(), t: z.number() }),
  z.strictObject({ seg: z.string(), offset: z.number().min(0) }),
  z.strictObject({ out: z.number().min(0) }),
]);
export type Anchor = z.infer<typeof Anchor>;

const Visual = z.union([
  z.strictObject({ component: z.string(), props: z.record(z.string(), z.unknown()).default({}) }),
  /** Path relative to the project folder, e.g. "work/assets/drone.mp4" or "../_library/broll/highway.mp4" */
  z.strictObject({ file: z.string() }),
]);

export const FootageSegment = z.strictObject({
  type: z.literal('footage'),
  id: z.string(),
  /** File name in input/footage (or in the sourceProject) */
  clip: z.string(),
  in: z.number().min(0),
  out: z.number().min(0),
  /** Does a YouTube chapter start here? Title for the chapter list (.chapters.txt) */
  chapter: z.string().min(1).max(100).optional(),
  /** e.g. "S12" – sentence ID from candidates.md */
  scriptRef: z.string().optional(),
  note: z.string().optional(),
  /** Tighten speech pauses within the segment (default: true) */
  tightenPauses: z.boolean().optional(),
  /** Crop (mainly for 9:16 from 16:9 footage) */
  focusX: z.number().min(0).max(1).optional(),
  focusY: z.number().min(0).max(1).optional(),
  /** Fixed zoom instead of jump-cut alternation */
  zoom: z.number().min(1).max(2).optional(),
});

export const VoiceSegment = z.strictObject({
  type: z.literal('voice'),
  id: z.string(),
  /** Does a YouTube chapter start here? Title for the chapter list (.chapters.txt) */
  chapter: z.string().min(1).max(100).optional(),
  /** ID from voiceInserts */
  voiceInsert: z.string(),
  /** What is on screen while the cloned voice speaks – never the speaker's face. */
  visual: Visual,
  note: z.string().optional(),
});

/** Silent fullscreen segment: intro sting, end card, B-roll stretch */
export const GraphicSegment = z.strictObject({
  type: z.literal('graphic'),
  id: z.string(),
  /** Does a YouTube chapter start here? Title for the chapter list (.chapters.txt) */
  chapter: z.string().min(1).max(100).optional(),
  visual: Visual,
  /** seconds */
  duration: z.number().positive(),
  note: z.string().optional(),
});

export const Segment = z.discriminatedUnion('type', [FootageSegment, VoiceSegment, GraphicSegment]);
export type Segment = z.infer<typeof Segment>;

export const VoiceInsert = z.strictObject({
  id: z.string(),
  /** key in brand/voices.json */
  voice: z.string(),
  text: z.string().min(1),
  model: z.string().optional(),
});

export const Overlay = z.strictObject({
  id: z.string(),
  /** Name from remotion/components (see the component's meta.md) */
  component: z.string(),
  at: Anchor,
  /** Seconds; defaults to the component's default duration */
  duration: z.number().positive().optional(),
  /** split = panel left of the speaker, full = fullscreen, overlay = on top of the speaker.
   *  Default: the first layout in the component's meta. */
  layout: z.enum(['split', 'full', 'overlay']).optional(),
  /** Place whoosh in/out automatically (default: true for split/full) */
  whoosh: z.boolean().optional(),
  /** Cues in props may be: a number (frames from graphic start), {"t": source second}, {"s": seconds from graphic start}.
   *  Media (src) relative to the project folder or "brand:<name>". */
  props: z.record(z.string(), z.unknown()).default({}),
});

/** A single sound from brand/sfx: `name` is the file name without extension. The folder ships empty –
 *  the names the house style uses (click, whoosh_in, chapter_impact …) are listed in brand/sfx/README.md.
 *  A name without a file is skipped with a warning. */
export const SfxCue = z.strictObject({
  name: z.string(),
  at: Anchor,
  /** Volume in dB (default from brand.json sound.sfxDefaultDb) */
  db: z.number().max(6).optional(),
  /** for risers: place the sound so it ENDS at the anchor (instead of starting there) */
  endsAt: z.boolean().default(false),
});

export const BRoll = z.strictObject({
  id: z.string(),
  /** path relative to the project folder */
  file: z.string(),
  at: Anchor,
  duration: z.number().positive(),
  /** Start point in the B-roll file (seconds) */
  trim: z.number().min(0).default(0),
  mode: z.enum(['full', 'pip']).default('full'),
  /** B-roll audio (0 = muted) */
  volume: z.number().min(0).max(1).default(0),
});

export const Music = z.strictObject({
  /** Path relative to the project folder, usually "../_library/music/<file>" */
  file: z.string(),
  volume: z.number().min(0).max(1).optional(),
  startAt: z.number().min(0).default(0),
  fadeIn: z.number().min(0).default(1.5),
  fadeOut: z.number().min(0).default(2.5),
});

export const Edl = z.strictObject({
  version: z.literal(1),
  slug: z.string(),
  format: Format,
  fps: z.number().int().positive().optional(),
  resolution: z.strictObject({ width: z.number().int(), height: z.number().int() }).optional(),
  pacing: z
    .strictObject({
      maxPause: z.number().positive().optional(),
      padding: z.number().min(0).optional(),
      zoomLevels: z.array(z.number().min(1).max(2)).min(1).optional(),
    })
    .optional(),
  framing: z.strictObject({ focusX: z.number().min(0).max(1), focusY: z.number().min(0).max(1) }).optional(),
  /** Audio track variant from work/audio/<clip>.<variant>.wav (e.g. "blend" from npm run audio -- <slug> --blend); falls back to <clip>.wav */
  audioVariant: z.string().regex(/^[a-z0-9-]+$/).optional(),
  sequence: z.array(Segment).min(1),
  voiceInserts: z.array(VoiceInsert).default([]),
  overlays: z.array(Overlay).default([]),
  broll: z.array(BRoll).default([]),
  music: Music.nullable().optional(),
  sfx: z.array(SfxCue).default([]),
  captions: z.strictObject({ enabled: z.boolean(), style: z.enum(['short', 'longform']).optional() }).optional(),
});
export type Edl = z.infer<typeof Edl>;
