// List: one box per row, active row in the accent color. Lists = boxes.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, Grow, Stage, boxStyle, t } from '../../look';
import { schema, type Props } from './def';

type Item = { f: number; title: string; sub?: string; value?: string };

const Row: React.FC<{ it: Item; i: number; numbered?: boolean; on: boolean; w: number; centered?: boolean }> = ({ it, i, numbered, on, w, centered }) => (
  <div style={{ width: w, display: 'flex', alignItems: 'center', justifyContent: centered ? 'center' : 'flex-start', gap: 44, padding: '40px 56px', minHeight: it.sub ? 214 : 160, ...boxStyle(on) }}>
    {numbered && (
      <div style={{ width: 96, height: 96, flexShrink: 0, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: on ? 'rgba(255,255,255,0.22)' : C.card, border: on ? 'none' : `3px solid ${C.border}` }}>
        <div style={t(54, 600, on ? C.card : C.gray700)}>{i + 1}</div>
      </div>
    )}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: centered ? undefined : 1, alignItems: centered ? 'center' : 'flex-start' }}>
      <div style={t(72, 600, on ? C.card : C.heading, { whiteSpace: 'normal', lineHeight: 1.15, textAlign: centered ? 'center' : 'left' })}>{it.title}</div>
      {it.sub && <div style={t(48, 500, on ? C.onAccentMuted : C.muted, { whiteSpace: 'normal', lineHeight: 1.25 })}>{it.sub}</div>}
    </div>
    {it.value && <div style={t(96, 600, on ? C.card : C.brand)}>{it.value}</div>}
  </div>
);

export const List: React.FC<Props> = (raw) => {
  const p = schema.parse(raw);
  const frame = useCurrentFrame();
  const shown = p.items.filter((it) => it.f < 0 || frame >= it.f);
  const fo = (p.focus ?? []).filter((x) => x.f < 0 || frame >= x.f);
  const active = fo.length ? fo[fo.length - 1].i : shown.length - 1;
  const centered = p.arrows && !p.numbered && !p.items.some((it) => it.value);
  return (
    <Stage>
      {p.items.map((it, i) => (
        <Grow key={i} f={it.f} first={i === 0} h={(it.sub ? 214 : 160) + (p.arrows && i > 0 ? 90 : 0)} gap={34}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            {p.arrows && i > 0 && <div style={{ ...t(64, 600, C.gray300), height: 70 }}>↓</div>}
            <Row it={it} i={i} numbered={p.numbered} on={i === active} w={centered ? Math.min(1600, p.w) : p.w} centered={centered} />
          </div>
        </Grow>
      ))}
      {p.note && (
        <Grow f={p.note.f} h={80} gap={64}>
          <div style={t(56, 600, C.brand, { whiteSpace: 'normal', textAlign: 'center', maxWidth: p.w })}>{p.note.text}</div>
        </Grow>
      )}
    </Stage>
  );
};
