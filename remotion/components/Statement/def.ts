import { z } from 'zod';
import type { ComponentMeta } from '../types';

const cue = z.number().describe('Frame relative to the graphic start; -1 = visible immediately');
const line = z.object({ f: cue, text: z.string().max(90) });

export const schema = z.object({
  label: z.string().max(60).optional().describe('small line on top, e.g. "Starting price" (card: light on accent, plain: gray)'),
  value: z.string().max(160).describe('statement, number or quote, e.g. "under $22,500", "93 %", "„…“"'),
  f: cue.default(0).describe('cue: value fades in; -1 = visible immediately'),
  caption: z.string().max(90).optional().describe('caption, appears 8 frames after value (e.g. unit, context)'),
  author: z.string().max(60).optional().describe('quote: name, role – appears 10 frames after value. If value is wrapped in „…“, the quote marks turn accent (plain)'),
  sub: line.optional().describe('plain only: accent line below (punchline) with its own cue'),
  plain: z.boolean().default(false).describe('free on the light surface instead of an accent card – for neutral numbers and quotes'),
  accent: z.boolean().default(false).describe('plain only: value in the accent color (the number is the good news)'),
  size: z.number().min(80).max(280).optional().describe('font size of value in design px; default: card 190 (long 120), plain number 280 (long 160), plain quote 128'),
  w: z.number().min(1200).max(2100).default(1500).describe('card width (design px), card only'),
});
export type Props = z.input<typeof schema>;

export const meta: ComponentMeta = { seconds: 6, minSeconds: 5, layouts: ['split', 'full'], portrait: 'stage', group: 'Cards' };

export const sample: Props = {
  label: 'Example price',
  value: 'from $19,990',
  f: 10,
};
