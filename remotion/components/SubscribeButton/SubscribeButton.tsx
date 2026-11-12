// Subscribe reminder in the light house style: white card (chip style) with the channel avatar (brand:channel-avatar), channel name and
// an accent "Subscribe" pill. A cursor moves in, clicks (the pill turns gray "Subscribed" with a check mark), then clicks the bell.
// Both clicks with sfx click (0.35). Bottom left, fades out during the last 10 frames.
// Sizes as website px × k; reference 1080p (s = shorter side / 1080), on the 4K grid k = K.
import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { sfx } from '../../lib/assets';
import { CARD_SHADOW, Icon, K, S, calm, clamp, media, t, txt } from '../../look';
import { schema, type Props } from './def';

// Controls (website px): pill 156 × 46, gap 10, bell 46
const BTN_W = 156;
const CTRL_H = 46;
const GAP_C = 10;
const BELL = 46;
const CURSOR = 34;
/** Tip of the mouse pointer on the 24 px grid */
const TIP = { x: 5.5, y: 3.2 };

const lerp = (a: number, b: number, v: number) => a + (b - a) * v;

export const SubscribeButton: React.FC<Props> = (raw) => {
  const p = schema.parse(raw);
  const frame = useCurrentFrame();
  const { width, height, durationInFrames, fps } = useVideoConfig();
  const s = Math.min(width, height) / 1080;
  const k = (K * s) / 2;
  const clickF = Math.max(0, Math.round(p.clickF));
  const bellF = Math.max(clickF + 12, Math.round(p.bellF));

  // Fade the card in and out
  const pin = interpolate(frame, [0, 14], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const outStart = Math.max(bellF + 20, durationInFrames - 10);
  const out = 1 - interpolate(frame, [outStart, outStart + 10], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });

  // States
  const subbed = interpolate(frame, [clickF, clickF + 6], [0, 1], clamp);
  const bellOn = interpolate(frame, [bellF, bellF + 6], [0, 1], clamp);
  const press = (at: number) => interpolate(frame, [at - 3, at, at + 5], [1, 0.92, 1], clamp);
  const ring = frame >= bellF ? Math.sin((frame - bellF) * 1.2) * 16 * Math.exp(-(frame - bellF) / 8) : 0;

  // Cursor: from bottom right to the pill, then to the bell, then away
  const btn = [BTN_W / 2, CTRL_H / 2];
  const bell = [BTN_W + GAP_C + BELL / 2, CTRL_H / 2];
  const start = [btn[0] + 150, btn[1] + 110];
  const away = [bell[0] + 120, bell[1] + 100];
  const m1 = interpolate(frame, [clickF - 22, clickF - 3], [0, 1], calm);
  const m2 = interpolate(frame, [clickF + 6, bellF - 3], [0, 1], calm);
  const m3 = interpolate(frame, [bellF + 8, bellF + 20], [0, 1], calm);
  const cx = lerp(lerp(lerp(start[0], btn[0], m1), bell[0], m2), away[0], m3);
  const cy = lerp(lerp(lerp(start[1], btn[1], m1), bell[1], m2), away[1], m3);
  const cursorO = interpolate(frame, [clickF - 24, clickF - 18], [0, 1], clamp) * (1 - interpolate(frame, [bellF + 10, bellF + 20], [0, 1], clamp));
  const cursorS = 1 - (1 - Math.min(press(clickF), press(bellF))) * 1.5;

  return (
    <AbsoluteFill>
      <div
        style={{ position: 'absolute', left: 96 * s, bottom: 112 * s, display: 'flex', alignItems: 'center', gap: 16 * k, boxSizing: 'border-box',
          padding: `${14 * k}px ${16 * k}px ${14 * k}px ${14 * k}px`, background: S.white, border: `${k}px solid ${S.gray200}`, borderRadius: 16 * k, boxShadow: CARD_SHADOW,
          opacity: pin * out, transform: `translateY(${(1 - pin) * 20 * k + (1 - out) * 10 * k}px)` }}
      >
        {/* Avatar: the channel's real YouTube profile picture */}
        <Img src={media('brand:channel-avatar')} style={{ width: 56 * k, height: 56 * k, borderRadius: 999, flexShrink: 0, objectFit: 'cover' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 * k }}>
          <div style={t(20 * k, 600, S.gray900, { lineHeight: 1.2 })}>{p.channel}</div>
          <div style={txt(15 * k, 400, S.gray600, { whiteSpace: 'nowrap' })}>{p.sub}</div>
        </div>
        <div style={{ position: 'relative', display: 'flex', gap: GAP_C * k, marginLeft: 12 * k, height: CTRL_H * k }}>
          {/* Pill: Subscribe → Subscribed */}
          <div style={{ position: 'relative', width: BTN_W * k, height: CTRL_H * k, borderRadius: 999, overflow: 'hidden', transform: `scale(${press(clickF)})` }}>
            <div style={{ position: 'absolute', inset: 0, background: S.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 1 - subbed }}>
              <div style={txt(17 * k, 600, S.white, { whiteSpace: 'nowrap' })}>Subscribe</div>
            </div>
            <div style={{ position: 'absolute', inset: 0, background: S.gray100, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 * k, opacity: subbed }}>
              <Icon name="check" size={18 * k} color={S.gray700} stroke={2.4} />
              <div style={txt(17 * k, 600, S.gray700, { whiteSpace: 'nowrap' })}>Subscribed</div>
            </div>
          </div>
          {/* Bell: appears after subscribing, turns accent on click and swings out */}
          <div style={{ position: 'relative', width: BELL * k, height: BELL * k, borderRadius: 999, background: bellOn > 0.5 ? S.accent50 : S.gray100,
            opacity: subbed, transform: `scale(${(0.8 + 0.2 * subbed) * press(bellF)})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: 22 * k, height: 22 * k, transform: `rotate(${ring}deg)`, transformOrigin: '50% 15%' }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 1 - bellOn }}>
                <Icon name="bell" size={22 * k} color={S.gray700} stroke={2} />
              </div>
              <div style={{ position: 'absolute', inset: 0, opacity: bellOn }}>
                <Icon name="bell" size={22 * k} color={S.accent} stroke={2.2} />
              </div>
            </div>
          </div>
          {/* Mouse pointer (tip = target point) */}
          <svg width={CURSOR * k} height={CURSOR * k} viewBox="0 0 24 24"
            style={{ position: 'absolute', left: cx * k - (TIP.x / 24) * CURSOR * k, top: cy * k - (TIP.y / 24) * CURSOR * k, opacity: cursorO,
              transform: `scale(${cursorS})`, transformOrigin: `${(TIP.x / 24) * 100}% ${(TIP.y / 24) * 100}%`, filter: `drop-shadow(0 ${2 * k}px ${4 * k}px rgba(16,24,40,0.35))`, overflow: 'visible' }}>
            <path d="M5.5 3.2v15.6l4.1-3.9 2.6 5.9 2.6-1.1-2.6-5.8h5.7z" fill={S.white} stroke={S.gray900} strokeWidth={1.3} strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      {p.sound && sfx.click ? (
        <>
          <Sequence from={clickF} durationInFrames={Math.round(fps)} layout="none" name="Click subscribe">
            <Audio src={sfx.click} volume={0.35} />
          </Sequence>
          <Sequence from={bellF} durationInFrames={Math.round(fps)} layout="none" name="Click bell">
            <Audio src={sfx.click} volume={0.35} />
          </Sequence>
        </>
      ) : null}
    </AbsoluteFill>
  );
};
