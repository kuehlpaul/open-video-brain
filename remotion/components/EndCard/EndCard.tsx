// YouTube end screen in the light house style:
// light surface without gradient, small accent logo on top, heading, two dashed 16:9 zones
// for the end-screen videos and a round subscribe circle with the channel avatar. Zone positions are listed in meta.md (percent) – place the elements exactly there in YouTube Studio.
import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { C, Icon, Logo, S, hasLogo, media, rise, t, txt, useIn } from '../../look';
import { schema, type Props } from './def';

// Zones on the 3840×2160 grid
const ZONE = { w: 1280, h: 720, top: 640, gap: 160 };
const SUB = { d: 400, cx: 1920, cy: 1660 };
const DASH = `6px dashed ${S.gray300}`;
const ZONE_BG = 'rgba(255,255,255,0.6)';

export const EndCard: React.FC<Props> = (raw) => {
  const p = schema.parse(raw);
  const x1 = (3840 - (2 * ZONE.w + ZONE.gap)) / 2;
  const x2 = x1 + ZONE.w + ZONE.gap;
  const pl = useIn(0, 12);
  const ph = useIn(6, 12);
  const pz = [useIn(12, 14), useIn(18, 14)];
  const ps = useIn(24, 14);
  return (
    <AbsoluteFill style={{ background: C.surface, overflow: 'hidden' }}>
      {hasLogo ? (
        <div style={{ position: 'absolute', top: 150, left: 0, right: 0, display: 'flex', justifyContent: 'center', ...rise(pl, 30) }}>
          {/* box of the placeholder logo (383×100); any other aspect ratio is fitted inside it */}
          <Logo variant="accent" width={520} style={{ height: 136, objectFit: 'contain' }} />
        </div>
      ) : null}
      <div style={{ position: 'absolute', top: 340, left: 0, right: 0, display: 'flex', justifyContent: 'center', ...rise(ph, 40) }}>
        <div style={t(120, 600, C.heading)}>{p.title}</div>
      </div>
      {[x1, x2].map((x, i) => (
        <div
          key={i}
          style={{ position: 'absolute', left: x, top: ZONE.top, width: ZONE.w, height: ZONE.h, boxSizing: 'border-box', border: DASH, borderRadius: 36, background: ZONE_BG,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, ...rise(pz[i], 40) }}
        >
          <Icon name="play" size={120} color={S.gray400} stroke={1.6} />
          <div style={txt(48, 500, S.gray500, { whiteSpace: 'nowrap' })}>{p.videoLabels[i]}</div>
        </div>
      ))}
      <Img
        src={media('brand:channel-avatar')}
        style={{ position: 'absolute', left: SUB.cx - SUB.d / 2, top: SUB.cy - SUB.d / 2, width: SUB.d, height: SUB.d, borderRadius: 999, objectFit: 'cover', ...rise(ps, 40) }}
      />
      <div style={{ position: 'absolute', top: SUB.cy + SUB.d / 2 + 28, left: 0, right: 0, display: 'flex', justifyContent: 'center', ...rise(ps, 40) }}>
        <div style={txt(44, 500, S.gray500, { whiteSpace: 'nowrap' })}>{p.subscribeLabel}</div>
      </div>
    </AbsoluteFill>
  );
};
