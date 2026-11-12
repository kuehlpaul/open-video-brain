import { z } from 'zod';
import type { ComponentMeta } from '../types';

const cue = z.number().describe('Frame relative to the graphic start; -1 = visible immediately');

export const schema = z.object({
  bars: z
    .array(
      z.object({
        label: z.string().max(20).describe('label below the column'),
        value: z.number().min(0).describe('height relative to max'),
        text: z.string().max(14).describe('displayed value above the column, e.g. "$9.99"'),
        f: cue.describe('cue: column grows, value fades in'),
      }),
    )
    .min(2)
    .max(5)
    .describe('columns from left to right; color gets stronger towards the right'),
  max: z.number().positive().optional().describe('value of a full column; default = largest value'),
});
export type Props = z.input<typeof schema>;

export const meta: ComponentMeta = { seconds: 7, minSeconds: 5, layouts: ['split', 'full'], portrait: 'stage', group: 'Cards' };

export const sample: Props = {
  bars: [
    { label: 'Example A', value: 0.5, text: '$0.50', f: 10 },
    { label: 'Example B', value: 0.7, text: '$0.70', f: 40 },
    { label: 'Example C', value: 0.8, text: '$0.80', f: 70 },
  ],
};
