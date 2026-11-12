import { z } from 'zod';
import type { ComponentMeta } from '../types';

const cue = z.number().describe('Frame relative to the graphic start; -1 = visible immediately');

export const schema = z.object({
  big: z.string().max(14).describe('large line, e.g. "10–80 %"'),
  from: z.number().min(0).max(100).default(0).describe('bar starts at this percentage of the track'),
  to: z.number().min(0).max(100).describe('bar ends at this percentage of the track'),
  f: cue.default(6).describe('cue: bar fills from here (30 frames); -1 = full immediately'),
  plain: z.boolean().default(false).describe('free on the light surface, no box (single statement)'),
  caption: z.string().max(56).optional().describe('gray line below, e.g. "in under 20 minutes"'),
});
export type Props = z.input<typeof schema>;

export const meta: ComponentMeta = { seconds: 6, minSeconds: 5, layouts: ['split', 'full'], portrait: 'stage', group: 'Cards' };

export const sample: Props = {
  big: '10–80 %',
  from: 10,
  to: 80,
  caption: 'Example: progress',
};
