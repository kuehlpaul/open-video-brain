import { z } from 'zod';
import type { ComponentMeta } from '../types';

const cue = z.number().describe('Frame relative to the graphic start; -1 = visible immediately');
const side = z.object({
  value: z.string().max(16).describe('value/name, e.g. "Version 2"'),
  above: z.string().max(24).optional().describe('small line above, e.g. "before"'),
  below: z.string().max(24).optional().describe('small line below, e.g. "France"'),
});

export const schema = z.object({
  from: side.describe('left: old value, gets struck through'),
  to: side.describe('right: new value'),
  strikeF: cue.default(-1).describe('from here the left side is struck through and the right side fades in; -1 = from the start'),
  plain: z.boolean().default(false).describe('no card, free on the surface, vertical old ↓ new'),
  w: z.number().min(1200).max(2100).default(1500).describe('card width (design px)'),
});
export type Props = z.input<typeof schema>;

export const meta: ComponentMeta = { seconds: 6, minSeconds: 5, layouts: ['split', 'full'], portrait: 'stage', group: 'Cards' };

export const sample: Props = {
  from: { value: 'Old', above: 'before', below: 'Example A' },
  to: { value: 'New', above: 'now', below: 'Example B' },
  strikeF: 30,
};
