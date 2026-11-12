/**
 * Creates a new project.
 *   npm run new -- 2026-11-home-office-tips --title "5 tips for working from home"
 *   npm run new -- 2026-11-home-office-short-desk --format short --source 2026-11-home-office-tips
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseCli } from './lib/cli';
import { log, main } from './lib/log';
import { PROJECTS, ensureDir, projectPaths, writeJson } from './lib/paths';
import { ProjectConfig } from './schemas/project';
import { brand } from '../brand/tokens';

const USAGE = 'npm run new -- <slug> [--title "..."] [--format longform|short] [--source <longform-slug>] [--speaker host] [--language <code, default brand.json → channel.language>]';

main(async () => {
  const { values, positionals } = parseCli(USAGE, {
    title: { type: 'string' },
    format: { type: 'string' },
    source: { type: 'string' },
    speaker: { type: 'string', default: 'host' },
    language: { type: 'string', default: brand.channel.language },
  });
  const slug = positionals[0];
  if (!slug) throw new Error(`Slug missing.\n  Usage: ${USAGE}`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error('Slug may only contain a-z, 0-9 and hyphens (e.g. 2026-11-home-office-tips).');
  if (slug.startsWith('_')) throw new Error('Slugs starting with _ are reserved for system folders.');
  // Validate everything before a folder is created. A Short cut from a longform (--source) is a Short unless stated otherwise.
  const format = values.format ?? (values.source ? 'short' : 'longform');
  if (format !== 'longform' && format !== 'short') throw new Error(`--format must be longform or short (got "${format}").`);
  if (values.source && format !== 'short') throw new Error('--source is for Shorts cut from a longform – drop --format longform.');
  if (fs.existsSync(projectPaths(slug).dir)) throw new Error(`Project already exists: ${projectPaths(slug).dir}`);
  if (values.source && !fs.existsSync(projectPaths(values.source).dir)) {
    throw new Error(`Source project "${values.source}" does not exist.`);
  }
  // folders: shorts live next to their longform (<video>/shorts/<name>), the longform in <video>/longform.
  let dir = path.join(PROJECTS, slug);
  if (values.source) {
    const srcDir = projectPaths(values.source).dir;
    if (path.basename(srcDir) === 'longform') {
      const name = slug.startsWith(`${values.source}-short-`) ? slug.slice(values.source.length + 7) : slug;
      dir = path.join(path.dirname(srcDir), 'shorts', name);
    }
  } else if (format !== 'short') {
    dir = path.join(PROJECTS, slug, 'longform');
  }
  const paths = { ...projectPaths(slug), dir };
  paths.config = path.join(dir, 'project.json');
  paths.footage = path.join(dir, 'input', 'footage');
  paths.work = path.join(dir, 'work');
  paths.output = path.join(dir, 'output');

  const template = path.join(PROJECTS, '_template');
  fs.cpSync(template, paths.dir, { recursive: true, filter: (src) => !path.basename(src).startsWith('._') });
  for (const d of [paths.footage, paths.work, paths.output]) ensureDir(d);

  const config = ProjectConfig.parse({
    slug,
    title: values.title ?? '',
    format,
    language: values.language,
    speaker: values.speaker,
    sourceProject: values.source,
    keyterms: [],
    createdAt: new Date().toISOString(),
  });
  writeJson(paths.config, config);

  log.ok(`Project created: ${path.relative(path.dirname(PROJECTS), dir)}`);
  if (values.source) {
    log.info(`Footage + transcripts come from ${path.relative(path.dirname(PROJECTS), projectPaths(values.source).dir)}. Only put the script/idea here.`);
  } else {
    log.info(`1. Copy footage to ${path.relative(path.dirname(PROJECTS), dir)}/input/footage/`);
  }
  log.info(`2. Put the script at ${path.relative(path.dirname(PROJECTS), dir)}/input/script.md`);
  log.info(`3. In Claude Code: /produce-video ${slug}`);
});
