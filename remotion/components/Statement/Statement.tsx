// Statement in two variants:
//  card (default): accent card, small line on top, large statement on the cue – the strongest emphasis in the look.
//  plain: free on the light surface without a box: number or quote,
//         gray line above, caption/author, accent punchline below. Single-statement screen = no box.
import React from 'react';
import { C, Grow, Shell, Stage, t, useP } from '../../look';
import { schema, type Props } from './def';

/** derived cue: f < 0 stays "visible immediately" */
const after = (f: number, d: number) => (f < 0 ? -1 : f + d);

/** Quote text; Quote marks („…“, “…”, "…") at the start/end are rendered in the accent color */
const QuoteText: React.FC<{ text: string; size: number }> = ({ text, size }) => {
  const m = text.match(/^([„“"])(.*)([“”"])$/s);
  const style = t(size, 600, C.heading, { whiteSpace: 'normal', textAlign: 'center', lineHeight: 1.1, maxWidth: 1900 });
  if (!m) return <div style={style}>{text}</div>;
  return (
    <div style={style}>
      <span style={{ color: C.brand }}>{m[1]}</span>
      {m[2]}
      <span style={{ color: C.brand }}>{m[3]}</span>
    </div>
  );
};

const Card: React.FC<ReturnType<typeof schema.parse>> = (p) => {
  const pr = useP(p.f, 8);
  const pc = useP(after(p.f, p.author ? 10 : 8), 8);
  const size = p.size ?? (p.value.length > 14 ? 120 : 190);
  const below = p.author ?? p.caption;
  return (
    <Shell h={820} w={p.w} accent>
      {p.label ? <div style={{ ...t(58, 500, C.onAccentSoft), lineHeight: '64px' }}>{p.label}</div> : null}
      {p.label ? <div style={{ height: 30 }} /> : null}
      <div style={{ ...t(size, 600, C.card, { whiteSpace: 'normal', textAlign: 'center', maxWidth: p.w - 200 }), opacity: pr }}>{p.value}</div>
      {below ? <div style={{ ...t(56, 500, C.onAccentSoft, { whiteSpace: 'normal', textAlign: 'center', maxWidth: p.w - 200 }), marginTop: 36, opacity: pc }}>{below}</div> : null}
    </Shell>
  );
};

const Plain: React.FC<ReturnType<typeof schema.parse>> = (p) => {
  const quote = Boolean(p.author) || /^[„“"]/.test(p.value);
  const size = p.size ?? (quote ? 128 : p.value.length > 12 ? 160 : 280);
  const lines = Math.max(1, Math.ceil((p.value.length * size) / (1900 * 0.55)));
  const valueH = lines * size * 1.12;
  return (
    <Stage>
      {p.label && (
        <Grow f={-1} h={90} first>
          <div style={t(64, 500, C.muted, { whiteSpace: 'normal', textAlign: 'center', maxWidth: 1800 })}>{p.label}</div>
        </Grow>
      )}
      <Grow f={p.f} h={valueH} first={!p.label} gap={40}>
        {quote ? (
          <QuoteText text={p.value} size={size} />
        ) : (
          <div style={t(size, 600, p.accent ? C.brand : C.heading, { whiteSpace: 'normal', textAlign: 'center', lineHeight: 1.05, maxWidth: 1900 })}>{p.value}</div>
        )}
      </Grow>
      {p.caption && (
        <Grow f={after(p.f, 8)} h={90} gap={36}>
          <div style={t(66, 500, C.muted, { whiteSpace: 'normal', textAlign: 'center', maxWidth: 1800 })}>{p.caption}</div>
        </Grow>
      )}
      {p.author && (
        <Grow f={after(p.f, 10)} h={80} gap={44}>
          <div style={t(56, 500, C.muted)}>{p.author}</div>
        </Grow>
      )}
      {p.sub && (
        <Grow f={p.sub.f} h={90} gap={56}>
          <div style={t(70, 600, C.brand, { whiteSpace: 'normal', textAlign: 'center', maxWidth: 1800 })}>{p.sub.text}</div>
        </Grow>
      )}
    </Stage>
  );
};

export const Statement: React.FC<Props> = (raw) => {
  const p = schema.parse(raw);
  return p.plain ? <Plain {...p} /> : <Card {...p} />;
};
