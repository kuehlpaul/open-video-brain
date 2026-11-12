// Bars free on the surface: label left, value right, track below.
// Single-statement screen (one graphic) = no box.
import React from 'react';
import { BAR, C, Grow, Stage, t, useIn } from '../../look';
import { schema, type Props } from './def';

const after = (f: number, d: number) => (f < 0 ? -1 : f + d);

type Row = { f: number; fl?: number; label: string; value: number; text: string; tone: 'brand' | 'muted' | 'warn' };

const BarLine: React.FC<{ r: Row; max: number }> = ({ r, max }) => {
  const pr = useIn(after(r.f, 4), 26);
  const v = useIn(r.f, 12);
  const fill = r.tone === 'muted' ? C.brand300 : r.tone === 'warn' ? C.error : BAR;
  return (
    <div style={{ width: 1760, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={t(64, 500, C.text)}>{r.label}</div>
        <div style={{ ...t(110, 600, r.tone === 'muted' ? C.gray400 : C.heading), opacity: v }}>{r.text}</div>
      </div>
      <div style={{ height: 56, borderRadius: 99, background: C.track, overflow: 'hidden' }}>
        <div style={{ height: 56, width: `${Math.min(1, r.value / max) * 100 * pr}%`, borderRadius: 99, background: fill }} />
      </div>
    </div>
  );
};

export const Bars: React.FC<Props> = (raw) => {
  const p = schema.parse(raw);
  const first = p.rows[0];
  return (
    <Stage>
      {p.rows.map((r, i) => (
        <Grow key={i} f={r.fl ?? r.f} h={190} first={i === 0} gap={72}>
          <BarLine r={r} max={p.max} />
        </Grow>
      ))}
      {p.footnote && (
        <Grow f={after(first.fl ?? first.f, 10)} h={70} gap={56}>
          <div style={t(50, 500, C.muted)}>{p.footnote}</div>
        </Grow>
      )}
    </Stage>
  );
};
