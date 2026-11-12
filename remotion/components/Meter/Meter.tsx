// Fill level: large line, the track fills from `from` to `to` (percent of the track), gray caption below.
import React from 'react';
import { BAR, C, Shell, Stage, t, useP } from '../../look';
import { schema, type Props } from './def';

const TRACK = 1100;

export const Meter: React.FC<Props> = (raw) => {
  const p = schema.parse(raw);
  const pr = useP(p.f, 30);
  const lo = Math.min(p.from, p.to);
  const hi = Math.max(p.from, p.to);
  const body = (
    <>
      <div style={t(220)}>{p.big}</div>
      <div style={{ padding: '64px 0 44px', display: 'flex' }}>
        <div style={{ width: TRACK, height: 56, borderRadius: 99, background: C.track, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: (lo / 100) * TRACK, top: 0, width: ((hi - lo) / 100) * TRACK * pr, height: 56, background: BAR, borderRadius: 99 }} />
        </div>
      </div>
      {p.caption ? <div style={t(76, 500, C.muted)}>{p.caption}</div> : null}
    </>
  );
  return p.plain ? <Stage>{body}</Stage> : <Shell h={900}>{body}</Shell>;
};
