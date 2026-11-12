// Name tag: just the name, Inter 700, white, free on the image – no box, no icon, no badge.
// Legible on light backgrounds (windows) thanks to a soft dark shadow, no background fill.
// 16:9 bottom left (1080p grid: 96 px from the left, 104 px from the bottom), 9:16 left 64 px with the bottom edge at 62 % (above the captions).
// Rises in over brand.motion.enterFrames, fades out during the last 10 frames.
import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, clamp, rise, t, useIn } from '../../look';
import { schema, type Props } from './def';

/** Font size on the 1080p grid */
const SIZE_1080 = 52;

export const NameTag: React.FC<Props> = (raw) => {
  const p = schema.parse(raw);
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const portrait = height > width;
  const s = Math.min(width, height) / 1080;
  const pin = useIn(0);
  const outStart = Math.max(18, durationInFrames - 10);
  const out = 1 - interpolate(frame, [outStart, outStart + 10], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const pos: React.CSSProperties = portrait ? { left: 64 * s, bottom: height * 0.38 } : { left: 96 * s, bottom: 104 * s };
  const r = rise(pin, 20 * s);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          ...pos,
          ...t(SIZE_1080 * s, 700, C.white),
          textShadow: `0 ${2 * s}px ${24 * s}px rgba(16,24,40,0.45), 0 0 ${6 * s}px rgba(16,24,40,0.25)`,
          opacity: (r.opacity as number) * out,
          transform: r.transform,
        }}
      >
        {p.name}
      </div>
    </AbsoluteFill>
  );
};
