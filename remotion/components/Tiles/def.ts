import { z } from 'zod';
import type { ComponentMeta } from '../types';

const cue = z.number().describe('Frame relative to the graphic start; -1 = visible immediately');

export const schema = z.object({
  tiles: z
    .array(
      z.object({
        f: cue,
        big: z.string().max(9).describe('large value, e.g. "128 GB"'),
        small: z.string().max(28).describe('caption'),
        accent: z.boolean().default(false).describe('highlighted (active) tile, in the accent color'),
      }),
    )
    .min(1)
    .max(4)
    .describe('split and 9:16: at most 2 tiles in a row, 3–4 with grid; full frame up to 4'),
  grid: z.boolean().default(false).describe('2×2 grid instead of a row (3–4 tiles, also fits the split)'),
});
export type Props = z.input<typeof schema>;

export const meta: ComponentMeta = { seconds: 6, minSeconds: 5, layouts: ['split', 'full'], portrait: 'stage', group: 'Cards' };

export const sample: Props = {
  tiles: [
    { f: 0, big: '128 GB', small: 'Example A', accent: true },
    { f: 30, big: '256 GB', small: 'Example B' },
  ],
};
