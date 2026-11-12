import { z } from 'zod';
import type { ComponentMeta } from '../types';

const cue = z.number().describe('Frame relative to the graphic start; -1 = visible immediately');

export const schema = z.object({
  chips: z
    .array(
      z.object({
        f: cue,
        text: z.string().max(30),
        accent: z.boolean().default(false).describe('highlighted term, in the accent color'),
      }),
    )
    .min(1)
    .max(16),
});
export type Props = z.input<typeof schema>;

export const meta: ComponentMeta = { seconds: 7, minSeconds: 5, layouts: ['split', 'full'], portrait: 'stage', group: 'Cards' };

export const sample: Props = {
  chips: [
    { f: 0, text: 'Provider A' },
    { f: 8, text: 'Provider B' },
    { f: 16, text: 'Provider C' },
    { f: 24, text: 'Provider D' },
    { f: 32, text: 'Provider E' },
    { f: 50, text: 'Highlighted example', accent: true },
  ],
};
