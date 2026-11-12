// Gap between two values: from → to on top, large accent counter ("+61 %"),
// optional accent pill for context.
// The counter is formatted in the channel language from brand.json (en → "1,500.5", de → "1.500,5").
import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { C, Shell, clamp, t, useP } from '../../look';
import { brand } from '../../../brand/tokens';
import { schema, type Props } from './def';

export const Delta: React.FC<Props> = (raw) => {
  const p = schema.parse(raw);
  const f = useCurrentFrame();
  const prog = p.countF < 0 ? 1 : interpolate(f, [p.countF, p.countF + 20], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const k = Math.pow(10, p.decimals);
  const n = Math.round(p.delta * prog * k) / k;
  const num = n.toLocaleString(brand.channel.language, { minimumFractionDigits: p.decimals, maximumFractionDigits: p.decimals });
  const pill = useP(p.pill ? p.pill.f : -1, 10);
  const col = (label: string, value: string, on: boolean) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={t(52, 500, C.muted)}>{label}</div>
      <div style={t(96, 600, on ? C.heading : C.gray400)}>{value}</div>
    </div>
  );
  return (
    <Shell h={p.pill ? 1100 : 900} gap={56}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 64 }}>
        {col(p.from.label, p.from.value, false)}
        <div style={t(90, 600, C.gray300)}>→</div>
        {col(p.to.label, p.to.value, true)}
      </div>
      <div style={t(260, 600, C.brand)}>
        {p.prefix}
        {num}
        {p.suffix}
      </div>
      {p.pill ? (
        <div style={{ padding: '28px 64px', borderRadius: 99, background: C.brand, border: `6px solid ${C.onAccentMuted}`, opacity: pill, transform: `translateY(${30 * (1 - pill)}px)` }}>
          <div style={t(64, 600, C.card)}>{p.pill.text}</div>
        </div>
      ) : null}
    </Shell>
  );
};
