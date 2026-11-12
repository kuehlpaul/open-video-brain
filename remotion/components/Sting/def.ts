import { z } from 'zod';
import type { ComponentMeta } from '../types';

/** No props – the sting is always the same (accent logo on a light surface, "mark drop" animation). */
export const schema = z.object({});
export type Props = z.input<typeof schema>;

export const meta: ComponentMeta = { seconds: 2, minSeconds: 1.2, layouts: ['full'], portrait: 'native', group: 'Overlays' };

export const sample: Props = {};
