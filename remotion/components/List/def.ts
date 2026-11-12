import { z } from 'zod';
import type { ComponentMeta } from '../types';

const cue = z.number().describe('Frame relative to the graphic start; -1 = visible immediately');

export const schema = z.object({
  items: z
    .array(
      z.object({
        f: cue,
        title: z.string().max(60),
        sub: z.string().max(90).optional(),
        value: z.string().max(16).optional(),
      }),
    )
    .min(1)
    .max(6),
  numbered: z.boolean().default(false),
  /** Process from top to bottom (arrows between the boxes) */
  arrows: z.boolean().default(false),
  /** accent line below the list */
  note: z.object({ f: cue, text: z.string().max(80) }).optional(),
  /** switch the active (accent) box: from frame f box i is active. Without focus the most recently shown box is active. */
  focus: z.array(z.object({ f: cue, i: z.number().int().min(0) })).optional(),
  w: z.number().default(1840),
});
export type Props = z.input<typeof schema>;

export const meta: ComponentMeta = { seconds: 7, minSeconds: 5, layouts: ['split', 'full'], portrait: 'stage', group: 'Cards' };

export const sample: Props = {
  items: [
    { f: 0, title: 'Plan the shoot', sub: 'script, locations, gear' },
    { f: 25, title: 'Record', sub: 'at least two takes per scene' },
    { f: 50, title: 'Edit', sub: 'rough cut first, polish later' },
  ],
};
