// Process from left to right: stations as boxes with arrows, active station in the accent color.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, Shell, t } from '../../look';
import { schema, type Props } from './def';

export const Flow: React.FC<Props> = (raw) => {
  const p = schema.parse(raw);
  const frame = useCurrentFrame();
  const fo = (p.steps ?? []).filter((x) => x.f < 0 || frame >= x.f);
  const active = p.steps ? (fo.length ? fo[fo.length - 1].i : -1) : p.step;
  const n = p.nodes.length;
  // 3 stations in 1800 px; width grows with the count (470 box + ~152 arrow)
  const w = Math.max(1500, n * 470 + (n - 1) * 152 + 86);
  return (
    <Shell w={w} h={760}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        {p.nodes.map((nd, i) => {
          const on = i === active;
          return (
            <React.Fragment key={i}>
              <div
                style={{
                  width: 470, height: 360, boxSizing: 'border-box', borderRadius: 40, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center',
                  background: on ? C.brand : C.card, border: on ? `6px solid ${C.onAccentMuted}` : `3px solid ${C.border}`,
                }}
              >
                <div style={t(84, 600, on ? C.card : C.heading)}>{nd.title}</div>
                {nd.sub ? <div style={t(44, 500, on ? C.onAccentMuted : C.muted)}>{nd.sub}</div> : null}
              </div>
              {i < n - 1 && <div style={t(90, 600, C.gray300)}>→</div>}
            </React.Fragment>
          );
        })}
      </div>
    </Shell>
  );
};
