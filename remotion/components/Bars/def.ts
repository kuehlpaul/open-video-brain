import { z } from 'zod';
import type { ComponentMeta } from '../types';

const cue = z.number().describe('Frame relative to the graphic start; -1 = visible immediately');

export const schema = z.object({
  rows: z
    .array(
      z.object({
        f: cue.describe('cue for value + bar'),
        fl: cue.optional().describe('row (label + empty track) appears here already, before the value'),
        label: z.string().max(40),
        value: z.number().min(0).describe('length relative to max'),
        text: z.string().max(16).describe('displayed value, e.g. "50,000"'),
        tone: z.enum(['brand', 'muted', 'warn']).default('brand').describe('brand = accent gradient, muted = light accent/gray, warn = red'),
      }),
    )
    .min(1)
    .max(5),
  max: z.number().positive().describe('value that equals a full bar'),
  footnote: z.string().max(90).optional().describe('gray line below (e.g. unit, as-of date)'),
});
export type Props = z.input<typeof schema>;

export const meta: ComponentMeta = { seconds: 7, minSeconds: 5, layouts: ['split', 'full'], portrait: 'stage', group: 'Cards' };

export const sample: Props = {
  rows: [
    { fl: -1, f: 10, label: 'Example A', value: 50, text: '50' },
    { fl: -1, f: 40, label: 'Example B', value: 81, text: '81' },
  ],
  max: 100,
  footnote: 'Sample values',
};
