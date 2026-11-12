import fs from 'node:fs';
import { parseArgs, type ParseArgsConfig } from 'node:util';
import { ProjectConfig } from '../schemas/project';
import { projectPaths, readJson, type ProjectPaths } from './paths';

type Options = NonNullable<ParseArgsConfig['options']>;

/** Reads `<slug>` + flags. Every script is called as `npm run <x> -- <slug> [--flags]`. */
export function parseCli<T extends Options>(usage: string, options: T) {
  const { values, positionals } = parseArgs({ options, allowPositionals: true, strict: true });
  return { values, positionals, usage };
}

export type LoadedProject = { paths: ProjectPaths; config: ProjectConfig; source: ProjectPaths };

/** Loads a project. `source` points to the project holding footage + transcripts (for shorts possibly the longform). */
export function loadProject(slug: string | undefined, usage: string): LoadedProject {
  if (!slug) throw new Error(`Project missing.\n  Usage: ${usage}`);
  const paths = projectPaths(slug);
  if (!fs.existsSync(paths.dir)) throw new Error(`Project "${slug}" does not exist (${paths.dir}). Create it: npm run new -- ${slug}`);
  if (!fs.existsSync(paths.config)) throw new Error(`project.json missing in ${paths.dir}`);
  const config = ProjectConfig.parse(readJson(paths.config));
  const source = config.sourceProject ? projectPaths(config.sourceProject) : paths;
  if (config.sourceProject && !fs.existsSync(source.dir)) {
    throw new Error(`sourceProject "${config.sourceProject}" from project.json does not exist.`);
  }
  return { paths, config, source };
}
