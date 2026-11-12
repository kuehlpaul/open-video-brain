import { z } from 'zod';
import type { ComponentMeta } from '../types';

/** Remotion caption format (@remotion/captions): words with a leading space, times in ms relative to the graphic start */
const Token = z.object({
  text: z.string(),
  startMs: z.number(),
  endMs: z.number(),
  timestampMs: z.number().nullable(),
  confidence: z.number().nullable(),
});

export const schema = z.object({
  /** short = karaoke for Shorts (Inter 700, active word larger), longform = one calm line at the bottom center */
  style: z.enum(['short', 'longform']).default('short'),
  tokens: z.array(Token),
  /** frame ranges [from, to) with a light full-frame graphic → dark captions (set automatically by Main) */
  darkRanges: z.array(z.tuple([z.number(), z.number()])).default([]),
  /** frame ranges with a 9:16 split (speaker at the bottom) → captions lower at lowY (set automatically by Main) */
  lowRanges: z.array(z.tuple([z.number(), z.number()])).default([]),
  lowY: z.number().min(0).max(1).default(0.84),
});
export type Props = z.input<typeof schema>;

export const meta: ComponentMeta = { seconds: 10, minSeconds: 1, layouts: ['overlay'], portrait: 'overlay', group: 'Overlays' };

export const sample: Props = {
  style: 'short',
  tokens: [
    { text: 'What', startMs: 0, endMs: 320, timestampMs: null, confidence: null },
    { text: ' makes', startMs: 320, endMs: 700, timestampMs: null, confidence: null },
    { text: ' a', startMs: 700, endMs: 850, timestampMs: null, confidence: null },
    { text: ' great', startMs: 850, endMs: 1300, timestampMs: null, confidence: null },
    { text: ' video', startMs: 1300, endMs: 1750, timestampMs: null, confidence: null },
    { text: ' intro?', startMs: 1750, endMs: 2400, timestampMs: null, confidence: null },
    { text: " Let's", startMs: 2700, endMs: 2950, timestampMs: null, confidence: null },
    { text: ' take', startMs: 2950, endMs: 3250, timestampMs: null, confidence: null },
    { text: ' a', startMs: 3250, endMs: 3400, timestampMs: null, confidence: null },
    { text: ' look', startMs: 3400, endMs: 3750, timestampMs: null, confidence: null },
    { text: ' today.', startMs: 3750, endMs: 4400, timestampMs: null, confidence: null },
  ],
};
