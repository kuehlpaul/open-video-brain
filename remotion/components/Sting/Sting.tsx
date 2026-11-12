// Logo sting in the light house style: "mark drop".
// 1. The logo mark drops large and slightly rotated into the center of the frame, springs to its final size (motion blur while falling).
// 2. On impact an accent ring (shock wave) expands outwards and fades.
// 3. The mark glides left to its place in the logo, the wordmark wipes in from left to right behind it.
// 4. Hold with a slight push (1 → 1.03) so the image doesn't freeze.
// Resolution-independent: logo width = 51 % of the shorter frame side (1100 px at 2160). Geometry from the SVG viewBoxes:
// logo 383×100, mark x −0.5…47.5 / y 3…97, wordmark x 61.5…380.5 / y 26…93 (logo units).
import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, Logo, clamp } from '../../look';
import { schema, type Props } from './def';

const L = { w: 383, h: 100 };
const MARK = { x: -0.5, y: 3, w: 48, h: 94 };
const WORD = { x: 61.5, y: 26, w: 319, h: 67 };
const glide = { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) };

export const Sting: React.FC<Props> = (raw) => {
  schema.parse(raw);
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const m = Math.min(width, height);
  const W = m * 0.51; // logo width in px
  const u = W / L.w; // px per logo unit
  const px = (v: number) => (v * m) / 2160; // blur/stroke independent of size

  // 3. Mark glides from the center to its place (and shrinks from solo to logo size), wordmark wipes in
  const slide = interpolate(frame, [10, 22], [0, 1], glide);
  const centerShift = (L.w / 2 - (MARK.x + MARK.w / 2)) * u; // mark center → frame center
  const markX = centerShift * (1 - slide);
  const HERO = 1.7; // size of the mark while it stands alone in the center
  const hero = interpolate(slide, [0, 1], [HERO, 1]);
  const wipe = interpolate(frame, [17, 30], [0, 1], glide);
  const wordX = interpolate(wipe, [0, 1], [-6 * u, 0]);

  // 1. Mark impact (spring with a small overshoot)
  const drop = spring({ frame, fps, config: { damping: 15, stiffness: 220, mass: 0.6 } });
  const fall = interpolate(frame, [0, 6], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const markScale = interpolate(drop, [0, 1], [1.9, 1]) * hero;
  const markRot = interpolate(drop, [0, 1], [-10, 0]);
  const markY = interpolate(fall, [0, 1], [-0.9 * MARK.h * u, 0]);
  const markOpacity = interpolate(frame, [0, 3], [0, 1], clamp);
  const markBlur = interpolate(frame, [0, 5, 8], [px(18), px(10), 0], clamp);

  // 2. Shock wave on impact (ring around the mark center = frame center)
  const ring = interpolate(frame, [6, 20], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const ringD = interpolate(ring, [0, 1], [0.8, 3.2]) * HERO * MARK.h * u;
  const ringOpacity = interpolate(ring, [0, 0.15, 1], [0, 0.55, 0], clamp);
  const ringStroke = interpolate(ring, [0, 1], [px(26), px(4)]);

  // 4. Slight push over the whole duration
  const push = interpolate(frame, [0, 50], [1, 1.03], { extrapolateLeft: 'clamp', extrapolateRight: 'extend' });

  return (
    <AbsoluteFill style={{ background: C.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {ringOpacity > 0 ? (
        <div
          style={{
            position: 'absolute',
            width: ringD,
            height: ringD,
            borderRadius: '50%',
            border: `${ringStroke}px solid ${C.brand}`,
            opacity: ringOpacity,
          }}
        />
      ) : null}
      <div style={{ position: 'relative', width: W, height: L.h * u, transform: `scale(${push})` }}>
        <div
          style={{
            position: 'absolute',
            left: WORD.x * u,
            top: WORD.y * u,
            width: WORD.w * u,
            height: WORD.h * u,
            clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)`,
          }}
        >
          <Logo part="wordmark" width={WORD.w * u} style={{ display: 'block', transform: `translateX(${wordX}px)`, opacity: wipe > 0 ? 1 : 0 }} />
        </div>
        <Logo
          part="mark"
          width={MARK.w * u}
          style={{
            position: 'absolute',
            left: MARK.x * u,
            top: MARK.y * u,
            opacity: markOpacity,
            filter: markBlur > 0.05 ? `blur(${markBlur}px)` : undefined,
            transform: `translate(${markX}px, ${markY}px) rotate(${markRot}deg) scale(${markScale})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
