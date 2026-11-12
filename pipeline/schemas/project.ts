import { z } from 'zod';

export const Format = z.enum(['longform', 'short']);
export type Format = z.infer<typeof Format>;

/** projects/<slug>/project.json */
export const ProjectConfig = z.object({
  slug: z.string(),
  title: z.string().default(''),
  format: Format,
  language: z.string().default('en'),
  /** key in brand/voices.json – whose voice is heard in this video. */
  speaker: z.string().default('host'),
  /** For shorts cut from a longform: footage and transcripts come from this project. */
  sourceProject: z.string().optional(),
  /** Terms Scribe should reliably recognize (product names, brands). */
  keyterms: z.array(z.string()).default([]),
  createdAt: z.string(),
});
export type ProjectConfig = z.infer<typeof ProjectConfig>;
