import { bundle } from '@remotion/bundler';
import { env } from './env';
import { log } from './log';
import { PROJECTS, REMOTION_ENTRY } from './paths';

/**
 * Bundles the Remotion project. public dir = projects/ (symlinked so footage
 * is never copied). Brand assets are imported via webpack.
 */
export async function bundleRemotion(): Promise<string> {
  let last = -10;
  return bundle({
    entryPoint: REMOTION_ENTRY,
    publicDir: PROJECTS,
    symlinkPublicDir: true,
    onProgress: (p) => {
      if (p - last >= 25 || p === 100) {
        log.dim(`Bundle ${p}%`);
        last = p;
      }
    },
  });
}

/** Shared renderer options. */
export function rendererOptions() {
  return {
    browserExecutable: env('REMOTION_BROWSER_EXECUTABLE') ?? null,
    licenseKey: env('REMOTION_LICENSE_KEY') ?? null,
    logLevel: 'warn' as const,
  };
}
