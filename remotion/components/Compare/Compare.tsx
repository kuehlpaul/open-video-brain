// Before → after on an accent card: struck through on the left, arrow, new on the right.
// Without small lines = large variant (rename), with lines above/below = column variant.
// plain: no card, free on the surface, old on top → arrow down → new below.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, Shell, rise, strike, t, useIn, useP } from '../../look';
import { schema, type Props } from './def';

type Side = { value: string; above?: string; below?: string };

export const Compare: React.FC<Props> = (raw) => {
  const p = schema.parse(raw);
  const pr = useP(p.strikeF, 10);
  const struck = pr > 0.5;
  const hasAbove = Boolean(p.from.above || p.to.above);
  const hasBelow = Boolean(p.from.below || p.to.below);

  if (p.plain) return <Plain from={p.from} to={p.to} pr={pr} struck={struck} />;

  if (!hasAbove && !hasBelow) {
    // Rename: large, right bigger than left
    return (
      <Shell h={760} w={p.w} accent>
        <div style={{ display: 'flex', alignItems: 'center', gap: 70 }}>
          <div style={{ ...t(150, 600, struck ? C.onAccentSoft : C.card), ...(struck ? strike(10) : {}) }}>{p.from.value}</div>
          <div style={t(120, 600, C.card)}>→</div>
          <div style={{ ...t(170, 600, C.card), opacity: pr }}>{p.to.value}</div>
        </div>
      </Shell>
    );
  }

  // Column variant: small lines above/below
  const small = (text: string | undefined, show: boolean) =>
    show ? <div style={t(52, 500, C.card)}>{text || ' '}</div> : null;
  const col = (s: Side, value: React.ReactNode, o = 1) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: o }}>
      {small(s.above, hasAbove)}
      {value}
      {small(s.below, hasBelow)}
    </div>
  );
  return (
    <Shell h={900} w={p.w} accent>
      <div style={{ display: 'flex', alignItems: 'center', gap: 80 }}>
        {col(p.from, <div style={{ ...t(106, 600, struck ? C.onAccentSoft : C.card), ...(struck ? strike(8) : {}) }}>{p.from.value}</div>)}
        <div style={t(110, 600, C.card)}>→</div>
        {col(p.to, <div style={t(106, 600, C.card)}>{p.to.value}</div>, pr)}
      </div>
    </Shell>
  );
};

// Free on the surface, vertical: old (struck through) ↓ new. Dark text on a light background, accent arrow.
const Plain: React.FC<{ from: Side; to: Side; pr: number; struck: boolean }> = ({ from, to, pr, struck }) => {
  const pin = useIn(0, 16);
  const small = (text?: string) => (text ? <div style={t(64, 500, C.muted)}>{text}</div> : null);
  return (
    <AbsoluteFill style={{ background: C.surface, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 56, ...rise(pin, 36) }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {small(from.above)}
          <div style={{ ...t(170, 600, struck ? C.gray400 : C.heading), ...(struck ? strike(12) : {}) }}>{from.value}</div>
          {small(from.below)}
        </div>
        <div style={{ ...t(150, 600, C.brand), opacity: pr }}>↓</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, ...rise(pr, 36) }}>
          {small(to.above)}
          <div style={t(190, 600, C.heading)}>{to.value}</div>
          {small(to.below)}
        </div>
      </div>
    </AbsoluteFill>
  );
};
