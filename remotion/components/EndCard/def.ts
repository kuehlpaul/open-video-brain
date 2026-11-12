import { z } from 'zod';
import type { ComponentMeta } from '../types';

export const schema = z.object({
  /** Heading below the logo */
  title: z.string().max(40).default('Thanks for watching!'),
  /** small labels in the two video zones (covered by the YouTube end-screen videos) */
  videoLabels: z.tuple([z.string().max(28), z.string().max(28)]).default(['Next video', 'Recommended video']),
  /** Label below the round subscribe circle */
  subscribeLabel: z.string().max(20).default('Subscribe'),
});
export type Props = z.input<typeof schema>;

export const meta: ComponentMeta = { seconds: 15, minSeconds: 12, layouts: ['full'], portrait: false, group: 'Overlays' };

export const sample: Props = { title: 'Thanks for watching!', videoLabels: ['Next video', 'Recommended video'], subscribeLabel: 'Subscribe' };
