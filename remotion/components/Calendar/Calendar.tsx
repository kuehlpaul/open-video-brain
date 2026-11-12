// Year calendar: 12 month cells in 3 rows, highlighted months turn accent on the cue.
import React from 'react';
import { C, Shell, t, useP } from '../../look';
import { schema, type Props } from './def';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Accent color as "r,g,b" for the alpha fade-in */
const rgb = (hex: string) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
};

export const Calendar: React.FC<Props> = (raw) => {
  const p = schema.parse(raw);
  const pr = useP(p.at, 8);
  const accent = rgb(C.brand);
  return (
    <Shell w={1460} h={1100} gap={50}>
      <div style={t(96)}>{p.year}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
        {[0, 1, 2].map((r) => (
          <div key={r} style={{ display: 'flex', gap: 30 }}>
            {MONTHS.slice(r * 4, r * 4 + 4).map((m, j) => {
              const on = p.months.includes(r * 4 + j + 1) && pr > 0;
              return (
                <div
                  key={m}
                  style={{
                    width: 290, height: 170, boxSizing: 'border-box', borderRadius: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: on ? `rgba(${accent},${pr})` : C.card, border: on ? `6px solid rgba(255,255,255,${0.6 * pr})` : `3px solid ${C.border}`,
                  }}
                >
                  <div style={t(64, 600, on && pr > 0.5 ? C.card : C.gray700)}>{m}</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ ...t(52, 600, C.brand), opacity: pr }}>{p.caption}</div>
    </Shell>
  );
};
