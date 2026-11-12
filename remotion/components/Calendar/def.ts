import { z } from 'zod';
import type { ComponentMeta } from '../types';

const cue = z.number().describe('Frame relative to the graphic start; -1 = visible immediately');

export const schema = z.object({
  year: z.number().int().min(2000).max(2100),
  months: z.array(z.number().int().min(1).max(12)).max(12).describe('highlighted months, 1 = January'),
  caption: z.string().max(50).describe('accent line below the calendar, e.g. "Launch in spring"'),
  at: cue.default(10).describe('cue: months turn accent, caption fades in; -1 = visible immediately'),
});
export type Props = z.input<typeof schema>;

export const meta: ComponentMeta = { seconds: 6, minSeconds: 5, layouts: ['split', 'full'], portrait: 'stage', group: 'Cards' };

export const sample: Props = {
  year: 2027,
  months: [3, 4, 5],
  caption: 'Example: spring',
  at: 20,
};
