import { z } from 'zod';
import type { ComponentMeta } from '../types';

const cue = z.number().describe('Frame relative to the graphic start; -1 = visible immediately');

export const schema = z.object({
  nodes: z
    .array(
      z.object({
        title: z.string().max(12).describe('station, e.g. "Supplier"'),
        sub: z.string().max(24).optional().describe('small line, e.g. "handles billing"'),
      }),
    )
    .min(2)
    .max(4)
    .describe('stations from left to right; 4 stations only in full frame'),
  step: z.number().int().min(-1).default(-1).describe('statically active (accent) station, 0 = first; -1 = none'),
  steps: z
    .array(z.object({ f: cue, i: z.number().int().min(0) }))
    .optional()
    .describe('switch the active station: from frame f station i is accent (overrides step)'),
});
export type Props = z.input<typeof schema>;

export const meta: ComponentMeta = { seconds: 7, minSeconds: 5, layouts: ['split', 'full'], portrait: 'stage', group: 'Cards' };

export const sample: Props = {
  nodes: [
    { title: 'Station A', sub: 'Example' },
    { title: 'Station B', sub: 'Example' },
    { title: 'Station C', sub: 'Example' },
  ],
  steps: [
    { f: 0, i: 0 },
    { f: 60, i: 1 },
    { f: 120, i: 2 },
  ],
};
