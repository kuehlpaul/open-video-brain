import { z } from 'zod';
import { brand } from '../../../brand/tokens';
import type { ComponentMeta } from '../types';

const cue = z.number().describe('Frame relative to the graphic start; -1 = visible immediately');

export const schema = z.object({
  /** Channel name next to the avatar (YouTube profile picture); default from brand.json → channel.name */
  channel: z.string().max(24).default(brand.channel.name),
  /** Line below the channel name */
  sub: z.string().max(36).default('Videos about your topic.'),
  /** Click on "Subscribe" → "Subscribed" (default frame 42 = 1.4 s at 30 fps, 1.7 s at 25 fps). The cursor enters ~0.7 s earlier. */
  clickF: cue.default(42),
  /** Click on the bell (default frame 63 = 2.1 s at 30 fps, 2.5 s at 25 fps), at least 12 frames after clickF */
  bellF: cue.default(63),
  /** Click sound (sfx click, volume 0.35) on both clicks */
  sound: z.boolean().default(true),
});
export type Props = z.input<typeof schema>;

export const meta: ComponentMeta = { seconds: 4, minSeconds: 3.5, layouts: ['overlay'], portrait: false, group: 'Overlays' };

// No `channel` here: the default follows brand.json, and a long channel name must not break the catalog
export const sample: Props = { sub: 'Videos about your topic.', clickF: 42, bellF: 63, sound: true };
