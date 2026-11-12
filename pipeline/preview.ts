/**
 * Opens Remotion Studio with a project's timeline (preview in the browser, scrub).
 *   npm run preview -- <slug>
 * Without a slug: Studio with the component catalog.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { log, main } from './lib/log';
import { ROOT, projectPaths } from './lib/paths';

main(async () => {
  const slug = process.argv[2];
  const args = [path.join(ROOT, 'node_modules', '@remotion', 'cli', 'remotion-cli.js'), 'studio'];
  if (slug) {
    const t = projectPaths(slug).timeline;
    if (!fs.existsSync(t)) throw new Error(`No timeline for ${slug} – npm run timeline -- ${slug}`);
    args.push(`--props=${t}`);
    log.info(`Opening Studio with ${slug} → select the "Main" composition`);
  }
  const child = spawn(process.execPath, args, { cwd: ROOT, stdio: 'inherit' });
  await new Promise<void>((resolve) => child.on('close', () => resolve()));
});
