import { z } from 'zod';
import type { ComponentMeta } from '../types';

export const schema = z.object({
  src: z.string().describe('clip: path relative to projects/'),
  from: z.number().min(0).default(0).describe('start point in the clip, in seconds'),
  zoom: z.number().min(1).max(4).default(1).describe('base zoom (Ken Burns starts here)'),
  zoomTo: z.number().min(1).max(4).optional().describe('linear zoom from zoom to zoomTo over the whole duration (replaces Ken Burns)'),
  zx: z.number().min(0).max(1).optional().describe('zoom point x (0–1), default = fx'),
  zy: z.number().min(0).max(1).optional().describe('zoom point y (0–1), default = fy'),
  fx: z.number().min(0).max(1).default(0.5).describe('crop x (object-position, 0–1)'),
  fy: z.number().min(0).max(1).default(0.5).describe('crop y (object-position, 0–1)'),
  kenBurns: z.boolean().default(true).describe('false if the same clip continues across several entries (otherwise the zoom jumps at the cut)'),
  source: z.string().max(80).optional().describe('source credit bottom left (white; gray with frame)'),
  headline: z
    .object({
      label: z.string().max(40).optional().describe('small line above, e.g. "Goal for 2027"'),
      value: z.string().max(32).describe('the one fact, large: number or short statement, e.g. "61 %", "Ends mid-2027"'),
      caption: z.string().max(60).optional().describe('caption, e.g. "of towns with 500+ residents"'),
      f: z.number().default(0).describe('cue (frame relative to the clip start); -1 = visible immediately'),
      cf: z.number().optional().describe('separate cue for the caption (default: 8 frames after value)'),
      accent: z.boolean().default(false).describe('value in the accent color (good news)'),
    })
    .optional()
    .describe('a single fact, large on the image (bottom left, white on a dark gradient) – instead of a standalone Statement card in a Short'),
  frame: z.enum(['none', 'monitor']).default('none').describe('monitor = clip plays in a screen mockup on a light surface (for excerpts from your own or other YouTube videos)'),
});
export type Props = z.input<typeof schema>;

export const meta: ComponentMeta = { seconds: 6, minSeconds: 5, layouts: ['split', 'full'], portrait: 'stage', group: 'Media', usesMedia: true };

export const sample: Props = {
  src: '_demo/input/footage/A001.mp4',
  from: 2,
  zoom: 1,
  fx: 0.5,
  fy: 0.5,
};
