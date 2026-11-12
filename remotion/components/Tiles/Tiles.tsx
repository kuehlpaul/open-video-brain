// Tiles side by side: list = one box per item, highlighted tile in the accent color.
// New tiles grow in width and push the row smoothly towards the center.
// grid: 2×2 grid with fixed slots (3–4 tiles, also in the split) – tiles rise in at their slot.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, SHADOW_CARD, rise, t, useIn } from '../../look';
import { schema, type Props } from './def';

type Tile = { f: number; big: string; small: string; accent: boolean };

const TileGrow: React.FC<{ tl: Tile; first: boolean }> = ({ tl, first }) => {
  const pr = useIn(tl.f, 18);
  if (pr <= 0) return null;
  const W = 860;
  return (
    <div style={{ width: (W + (first ? 0 : 60)) * pr, display: 'flex', justifyContent: 'flex-end' }}>
      <div
        style={{
          width: W, height: 520, boxSizing: 'border-box', borderRadius: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
          background: tl.accent ? C.brand : '#FFFFFF', border: tl.accent ? `6px solid ${C.onAccentMuted}` : `3px solid ${C.border}`, boxShadow: SHADOW_CARD, ...rise(pr, 36),
        }}
      >
        <div style={t(150, 600, tl.accent ? C.card : C.heading)}>{tl.big}</div>
        <div style={t(54, 500, tl.accent ? C.onAccentMuted : C.muted)}>{tl.small}</div>
      </div>
    </div>
  );
};

const TileBox: React.FC<{ tl: Tile; w: number; h: number }> = ({ tl, w, h }) => {
  const pr = useIn(tl.f, 18);
  return (
    <div
      style={{
        width: w, height: h, boxSizing: 'border-box', borderRadius: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
        background: tl.accent ? C.brand : '#FFFFFF', border: tl.accent ? `6px solid ${C.onAccentMuted}` : `3px solid ${C.border}`, boxShadow: SHADOW_CARD, ...rise(pr, 36),
      }}
    >
      <div style={t(140, 600, tl.accent ? C.card : C.heading)}>{tl.big}</div>
      <div style={t(54, 500, tl.accent ? C.onAccentMuted : C.muted)}>{tl.small}</div>
    </div>
  );
};

export const Tiles: React.FC<Props> = (raw) => {
  const p = schema.parse(raw);
  if (p.grid) {
    const W = 900;
    const H = 480;
    const GAP = 64;
    return (
      <AbsoluteFill style={{ background: C.surface, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `${W}px ${W}px`, gap: GAP }}>
          {p.tiles.map((tl, i) => (
            <TileBox key={i} tl={tl} w={W} h={H} />
          ))}
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ background: C.surface, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {p.tiles.map((tl, i) => (
          <TileGrow key={i} tl={tl} first={i === 0} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
