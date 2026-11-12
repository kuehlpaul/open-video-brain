/**
 * Renders a still of every catalog composition to brand/catalog/<id>.png –
 * the visual overview of all brand components (16:9 and 9:16).
 *   npm run catalog                  all
 *   npm run catalog -- Calendar      only components whose ID contains the text
 */
import path from 'node:path';
import { getCompositions, renderStill } from '@remotion/renderer';
import { log, main } from './lib/log';
import { BRAND, ensureDir, rootRel } from './lib/paths';
import { bundleRemotion, rendererOptions } from './lib/remotion';

main(async () => {
  const filter = process.argv[2];
  const out = ensureDir(path.join(BRAND, 'catalog'));
  const serveUrl = await bundleRemotion();
  const comps = (await getCompositions(serveUrl, rendererOptions())).filter(
    (c) => c.id.startsWith('Catalog-') && (!filter || c.id.includes(filter)),
  );
  log.step(`${comps.length} catalog stills`);
  for (const c of comps) {
    const frame = Math.min(c.durationInFrames - 1, Math.round(c.durationInFrames * 0.75));
    const file = path.join(out, `${c.id.replace('Catalog-', '')}.png`);
    await renderStill({ serveUrl, composition: c, output: file, frame, scale: 0.5, ...rendererOptions() });
    log.ok(rootRel(file));
  }
});
