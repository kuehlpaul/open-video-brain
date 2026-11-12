import { z } from 'zod';
import type { ComponentMeta } from '../types';

const cue = z.number().describe('Frame relative to the graphic start; -1 = visible immediately');
const side = z.object({
  label: z.string().max(24).describe('small gray line, e.g. "basic plan"'),
  value: z.string().max(16).describe('value, e.g. "$9.99"'),
});

export const schema = z.object({
  from: side.describe('left: starting value (gray)'),
  to: side.describe('right: comparison value (dark)'),
  delta: z.number().describe('difference as a number, counts up from 0 (sign via prefix)'),
  decimals: z.number().int().min(0).max(2).default(0).describe('decimal places of the counter'),
  prefix: z.string().max(3).default('+').describe('before the number, e.g. "+" or "−"'),
  suffix: z.string().max(8).default(' %').describe('after the number, e.g. " %" or " $"'),
  countF: cue.default(2).describe('cue: the number counts up for 20 frames from here; -1 = shown immediately'),
  pill: z
    .object({ f: cue, text: z.string().max(40) })
    .optional()
    .describe('accent pill below the number (context)'),
});
export type Props = z.input<typeof schema>;

export const meta: ComponentMeta = { seconds: 7, minSeconds: 5, layouts: ['split', 'full'], portrait: 'stage', group: 'Cards' };

export const sample: Props = {
  from: { label: 'Example A', value: '$0.50' },
  to: { label: 'Example B', value: '$0.80' },
  delta: 60,
  countF: 10,
  pill: { f: 50, text: 'Example context' },
};
