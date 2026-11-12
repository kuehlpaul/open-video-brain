// Term chips: one chip per term, one after another, highlight in the accent color.
// List = one box per item.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, t, useIn } from '../../look';
import { schema, type Props } from './def';

type Chip = { f: number; text: string; accent: boolean };

const Word: React.FC<{ c: Chip }> = ({ c }) => {
  const pr = useIn(c.f, 10);
  return (
    <div
      style={{
        padding: '28px 48px', borderRadius: 32, background: c.accent ? C.brand : '#FFFFFF', border: c.accent ? `5px solid ${C.onAccentMuted}` : `3px solid ${C.border}`,
        opacity: pr, transform: `scale(${0.9 + 0.1 * pr})`,
      }}
    >
      <div style={t(76, 600, c.accent ? C.card : C.heading)}>{c.text}</div>
    </div>
  );
};

export const Words: React.FC<Props> = (raw) => {
  const p = schema.parse(raw);
  return (
    <AbsoluteFill style={{ background: C.surface, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 1900, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 30 }}>
        {p.chips.map((c, i) => (
          <Word key={i} c={c} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
