import { loadFont } from '@remotion/fonts';
import { brand } from '../../brand/tokens';
import { brandFiles } from './brand-files';

/**
 * Loads every font file in brand/fonts/ under the family from brand.json (typography.family) –
 * local files, rendering needs no internet. Weight and style come from the file name:
 * "MyFont-Variable.woff2" / "MyFont[wght].ttf" = all weights, "MyFont-SemiBold.woff2" = 600,
 * "MyFont-BoldItalic.otf" = 700 italic. Empty folder → the family is used if it is installed
 * on the system, otherwise system-ui (see fontFamily in remotion/look).
 */
const family = brand.typography.family;

const WEIGHTS: Array<[RegExp, number]> = [
  [/thin|hairline/, 100],
  [/extra-?light|ultra-?light/, 200],
  [/light/, 300],
  [/semi-?bold|demi-?bold/, 600],
  [/extra-?bold|ultra-?bold/, 800],
  [/black|heavy/, 900],
  [/bold/, 700],
  [/medium/, 500],
];

function weightOf(name: string): string {
  const n = name.toLowerCase();
  if (/variable|wght|(^|[^a-z])(var|vf)([^a-z]|$)/.test(n)) return '100 900';
  return String(WEIGHTS.find(([re]) => re.test(n))?.[1] ?? 400);
}

const FORMATS = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' } as const;

for (const { name, ext, url } of brandFiles('fonts')) {
  const format = FORMATS[ext as keyof typeof FORMATS];
  if (!format) continue;
  loadFont({ family, url, weight: weightOf(name), style: /italic/i.test(name) ? 'italic' : 'normal', format });
}
