import { z } from 'zod';
import type { ComponentMeta } from '../types';

export const schema = z.object({
  text: z.string().max(140).describe('what is missing here, e.g. "Photo: city skyline at night"'),
});
export type Props = z.input<typeof schema>;

export const meta: ComponentMeta = { seconds: 5, minSeconds: 5, layouts: ['split', 'full'], portrait: 'stage', group: 'Media' };

export const sample: Props = {
  text: 'Placeholder: photo of the office (example)',
};
