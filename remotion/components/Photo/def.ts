import { z } from 'zod';
import type { ComponentMeta } from '../types';

export const schema = z.object({
  src: z.string().describe('image: path relative to projects/ or "brand:<name>"'),
  iw: z.number().positive().optional().describe('image width in px – set by the pipeline; if missing, object-fit: cover applies'),
  ih: z.number().positive().optional().describe('image height in px – set by the pipeline'),
  fx: z.number().min(0).max(1).default(0.5).describe('focus x (0–1): this image point sits in the center of the surface'),
  fy: z.number().min(0).max(1).default(0.5).describe('focus y (0–1)'),
  zoom: z.number().min(0.5).max(4).default(1).describe('crop zoom; 1 = image just covers the surface (< 1 only with contain)'),
  contain: z.boolean().default(false).describe('whole image on white (data sheet, chart) instead of cropping'),
  pad: z.string().default('240px 120px').describe('padding in contain mode (CSS padding, design px)'),
  source: z.string().max(80).optional().describe('source credit bottom left, e.g. "Photo: manufacturer"'),
});
export type Props = z.input<typeof schema>;

export const meta: ComponentMeta = { seconds: 6, minSeconds: 5, layouts: ['split', 'full'], portrait: 'stage', group: 'Media', usesMedia: true };

export const sample: Props = {
  src: 'brand:sample-photo',
  iw: 2880,
  ih: 2000,
  fx: 0.5,
  fy: 0.3,
  zoom: 1.1,
  source: 'Photo: example',
};
