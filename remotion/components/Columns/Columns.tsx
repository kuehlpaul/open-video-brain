// Columns on a white card: value above the column, label below,
// color ramp from light accent to full accent. Sizes relative to the surface → split, full frame and 9:16.
import React from 'react';
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, S, SHADOW_CARD, clamp, t } from '../../look';
import { schema, type Props } from './def';

/** Primary scale 200 / 300 / 400 / 500 / 600 (three columns use 200 / 400 / 600) */
const RAMP = [S.accent200, S.accent300, S.accent400, S.accent500, S.accent];
const colour = (i: number, n: number) => RAMP[Math.round((i * (RAMP.length - 1)) / Math.max(1, n - 1))];

const BASE = 0.82; // baseline (fraction of height)
const MAXH = 0.5; // full column (fraction of height)

export const Columns: React.FC<Props> = (raw) => {
  const p = schema.parse(raw);
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const n = p.bars.length;
  const max = (p.max ?? Math.max(...p.bars.map((b) => b.value))) || 1; // all values 0 → no division by zero
  // 3 columns at 24 / 50 / 76 % of the width; more columns share the same span
  const gap = n <= 3 ? 0.26 : 0.52 / (n - 1);
  const barW = n <= 3 ? 0.14 : gap * 0.54;
  const textW = n <= 3 ? 0.24 : gap * 0.92;
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.surface }}>
      <div style={{ position: 'absolute', left: 0.1 * W, top: 0.17 * H, width: 0.8 * W, height: 0.74 * H, boxSizing: 'border-box', background: '#FFFFFF', border: `3px solid ${C.border}`, borderRadius: 56, boxShadow: SHADOW_CARD }} />
      <div style={{ position: 'absolute', left: 0.14 * W, top: BASE * H, width: 0.72 * W, height: 3, background: C.border }} />
      {p.bars.map((b, i) => {
        const pr = b.f < 0 ? 1 : interpolate(frame, [b.f, b.f + 10], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
        const bh = (Math.min(b.value, max) / max) * MAXH * H * pr;
        const cx = (0.5 + (i - (n - 1) / 2) * gap) * W;
        return (
          <React.Fragment key={i}>
            {bh > 0 && <div style={{ position: 'absolute', left: cx - (barW / 2) * W, width: barW * W, top: BASE * H - bh, height: bh, background: colour(i, n), borderRadius: '28px 28px 8px 8px' }} />}
            {pr > 0 && <div style={{ position: 'absolute', left: cx - (textW / 2) * W, width: textW * W, top: BASE * H - bh - 100, textAlign: 'center', ...t(64), opacity: pr }}>{b.text}</div>}
            <div style={{ position: 'absolute', left: cx - (textW / 2) * W, width: textW * W, top: (BASE + 0.02) * H, textAlign: 'center', ...t(48, 500, C.text, { letterSpacing: '-0.01em' }) }}>{b.label}</div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
