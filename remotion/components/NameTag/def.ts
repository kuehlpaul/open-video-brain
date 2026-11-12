import { z } from 'zod';
import type { ComponentMeta } from '../types';

export const schema = z.object({
  /** Person's name as it should appear in the video (e.g. "Jane Doe" or just "Jane") */
  name: z.string().min(1).max(32),
});
export type Props = z.input<typeof schema>;

export const meta: ComponentMeta = { seconds: 4, minSeconds: 3, layouts: ['overlay'], portrait: 'overlay', group: 'Overlays' };

export const sample: Props = { name: 'Jane Doe' };
