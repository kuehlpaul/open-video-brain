/**
 * visuals.json = the "photo, video or graphic" decision per beat (skill /visuals-plan).
 * Claude only names the SIGNALS a beat shows. `decide()` computes the decision
 * deterministically from the weight table – so the rule isn't interpreted differently on every run.
 */
import { z } from 'zod';

export type Side = 'footage' | 'graphic';

/** Signal vocabulary with weights. `footage` and `graphic` weights are summed separately. */
export const SIGNALS = {
  // → photo / video
  concrete_thing: { side: 'footage', weight: 3, doc: 'Concrete thing, place, product, model, person (power drill, laptop, Eiffel Tower, coffee shop)' },
  action: { side: 'footage', weight: 3, doc: 'Visible action (plugging in, cooking, driving, installing) → video' },
  brand_or_place: { side: 'footage', weight: 2, doc: 'Brand or place reference with a well-known motif' },
  script_says_image: { side: 'footage', weight: 5, doc: 'Script direction names image/photo/clip/B-roll – binding' },
  list_concrete: { side: 'footage', weight: 3, doc: 'List of concrete things without explanatory text (one photo per item in the split)' },
  // → graphic
  number: { side: 'graphic', weight: 3, doc: 'Number, percentage, price, deadline' },
  comparison: { side: 'graphic', weight: 3, doc: 'Comparison, change, ranking' },
  process: { side: 'graphic', weight: 2, doc: 'Process, sequence, schedule' },
  abstract: { side: 'graphic', weight: 2, doc: 'Abstract concept (subsidy, efficiency, risk)' },
  list_explained: { side: 'graphic', weight: 1, doc: 'List with explanatory text per item' },
} as const satisfies Record<string, { side: Side; weight: number; doc: string }>;

export type SignalName = keyof typeof SIGNALS;
export const SIGNAL_NAMES = Object.keys(SIGNALS) as [SignalName, ...SignalName[]];

export const Decision = z.enum(['photo', 'video', 'photo+headline', 'graphic']);
export type Decision = z.infer<typeof Decision>;

export const Candidate = z.strictObject({
  file: z.string().describe('Path relative to the project folder'),
  provider: z.string(),
  url: z.string(),
  license: z.string(),
  credit: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  kind: z.enum(['image', 'video']),
  /** Photo narrower than 1600 px – only usable after `npm run upscale` */
  small: z.boolean().optional(),
});
export type Candidate = z.infer<typeof Candidate>;

export const Beat = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/, 'a-z, 0-9, -'),
  /** Source time (seconds per transcript) where the beat starts – same time as `at.t` in the EDL */
  from: z.number().min(0),
  to: z.number().min(0).optional(),
  /** Briefly, what is said */
  text: z.string(),
  /** Signals from SIGNALS; at least one */
  signals: z.array(z.enum(SIGNAL_NAMES)).min(1),
  /** Only if the grid gets it wrong: set the decision by hand (reason required) */
  override: z.strictObject({ decision: Decision, why: z.string().min(5) }).optional(),
  /** Search terms for the media search, concrete ("red industrial power socket"); for non-English videos add English terms too */
  queries: z.array(z.string()).default([]),
  /** Preferred sources, default: all available */
  providers: z.array(z.enum(['library', 'commons', 'openverse', 'nasa', 'pexels', 'pixabay', 'unsplash', 'coverr'])).optional(),
  /** Chosen media (relative to the project folder) – set by `--pick` or by Claude after review */
  asset: z.string().optional(),
  /** Source line for the photo (from Candidate.credit) */
  source: z.string().optional(),
  /** Filled in by the script */
  candidates: z.array(Candidate).default([]),
  /** Computed by the script */
  computed: z
    .strictObject({
      footage: z.number(),
      graphic: z.number(),
      decision: Decision,
    })
    .optional(),
  note: z.string().optional(),
});
export type Beat = z.infer<typeof Beat>;

export const Visuals = z.strictObject({
  beats: z.array(Beat),
});
export type Visuals = z.infer<typeof Visuals>;

/**
 * The decision rule (deterministic).
 *  - `script_says_image` is binding: photo/video, no matter what else the beat contains.
 *  - footage ≥ graphic → footage (ties go to footage; target media time ≈ 60 % real footage).
 *  - footage wins and the beat also carries a number → photo with headline (`headline`).
 *  - footage wins with `action` → video, otherwise photo.
 *  - otherwise graphic.
 */
export function decide(signals: SignalName[]): { footage: number; graphic: number; decision: Decision } {
  const set = new Set(signals);
  let footage = 0;
  let graphic = 0;
  for (const s of set) {
    const { side, weight } = SIGNALS[s];
    if (side === 'footage') footage += weight;
    else graphic += weight;
  }
  if (set.has('script_says_image') || footage >= graphic) {
    if (set.has('number') && !set.has('script_says_image') && !set.has('action')) return { footage, graphic, decision: 'photo+headline' };
    return { footage, graphic, decision: set.has('action') ? 'video' : 'photo' };
  }
  return { footage, graphic, decision: 'graphic' };
}
