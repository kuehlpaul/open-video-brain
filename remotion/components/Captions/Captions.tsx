// Captions.
//  short    – karaoke: Inter 700, 62 px (at 1080 wide), active word 71 px, white,
//             glow 0 0 28px rgba(255,255,255,0.35), centered at y = 0.68, max. 13 characters per line
//             (single words up to 20, longer words are hyphenated), no animation. Values = brand.json captions.short.
//             Dark without glow on light 9:16 full-frame graphics (darkRanges); lower at lowY in the 9:16 split (lowRanges).
//  longform – one calm line at the bottom center, white on rgba(16,24,40,0.72).
// Pages via createTikTokStyleCaptions (@remotion/captions); we set line breaks ourselves as pageBreakAfter.
// Start and end of each page are rounded to frames separately and capped at the next page → no 1-frame overlap.
import React, { useMemo } from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, fontFamily, txt } from '../../look';
import { schema, type Props } from './def';
import { CFG, buildPages, type Page } from './pages';

/** brand.json captions.short (1080 grid) */
const SHORT = { size: 62, activeSize: 71, y: 0.68, glowBlur: 28, glow: 'rgba(255,255,255,0.35)' };
const LONG_BOX = 'rgba(16,24,40,0.72)';

type Ranges = Array<[number, number]>;
const ShortPage: React.FC<{ page: Page; s: number; height: number; darkRanges: Ranges; lowRanges: Ranges; lowY: number }> = ({ page, s, height, darkRanges, lowRanges, lowY }) => {
  const frame = useCurrentFrame();
  const abs = page.from + frame;
  // On light full-frame graphics: dark text without glow
  const dark = darkRanges.some(([a, b]) => abs >= a && abs < b);
  // In the 9:16 split the speaker sits at the bottom → line lower, not over the mouth
  const y = lowRanges.some(([a, b]) => abs >= a && abs < b) ? lowY : SHORT.y;
  let active = 0;
  page.tokens.forEach((tk, i) => {
    if (tk.startF <= abs) active = i;
  });
  const base = SHORT.size * s;
  return (
    <AbsoluteFill>
      <div
        style={{ position: 'absolute', left: 0, right: 0, top: y * height, transform: 'translateY(-50%)', textAlign: 'center', whiteSpace: 'pre',
          fontFamily, fontWeight: 700, color: dark ? C.heading : C.white, lineHeight: `${Math.round(SHORT.activeSize * s * 1.15)}px`, textShadow: dark ? 'none' : `0 0 ${SHORT.glowBlur * s}px ${SHORT.glow}` }}
      >
        {page.tokens.map((tk, i) => (
          <React.Fragment key={i}>
            {i > 0 || tk.text.startsWith(' ') ? <span style={{ fontSize: base }}> </span> : null}
            <span style={{ fontSize: i === active ? SHORT.activeSize * s : base }}>{tk.text.trimStart()}</span>
          </React.Fragment>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const LongPage: React.FC<{ page: Page; s: number }> = ({ page, s }) => (
  <AbsoluteFill>
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 72 * s, display: 'flex', justifyContent: 'center' }}>
      <div style={{ background: LONG_BOX, borderRadius: 10 * s, padding: `${8 * s}px ${20 * s}px`, ...txt(40 * s, 500, C.white, { lineHeight: 1.3, whiteSpace: 'nowrap' }) }}>
        {page.text}
      </div>
    </div>
  </AbsoluteFill>
);

export const Captions: React.FC<Props> = (raw) => {
  const { fps, width, height } = useVideoConfig();
  // Parse props once (token lists can be long) – not again on every frame
  const p = useMemo(
    () => schema.parse({ style: raw.style, tokens: raw.tokens, darkRanges: raw.darkRanges, lowRanges: raw.lowRanges, lowY: raw.lowY }),
    [raw.style, raw.tokens, raw.darkRanges, raw.lowRanges, raw.lowY],
  );
  const pages = useMemo(() => buildPages(p.tokens, CFG[p.style], fps), [p, fps]);
  const s = Math.min(width, height) / 1080;
  return (
    <AbsoluteFill>
      {pages.map((pg, i) => (
        <Sequence key={i} from={pg.from} durationInFrames={pg.dur} name={pg.text}>
          {p.style === 'short' ? <ShortPage page={pg} s={s} height={height} darkRanges={p.darkRanges} lowRanges={p.lowRanges} lowY={p.lowY} /> : <LongPage page={pg} s={s} />}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
