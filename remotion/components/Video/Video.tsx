// Full-surface B-roll clip: muted, Ken Burns or linear zoom (zoomTo), scrim at the bottom.
import React from 'react';
import { AbsoluteFill, OffthreadVideo, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, S, SHADOW_CARD, Scrim, Source, media, rise, t, useIn, useKenBurns } from '../../look';
import { schema, type Props } from './def';

export const Video: React.FC<Props> = (raw) => {
  const p = schema.parse(raw);
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const kb = useKenBurns(p.zoom);
  // zoomTo: linear from zoom to zoomTo over the duration (can continue across several entries), otherwise Ken Burns
  const scale = p.zoomTo !== undefined ? interpolate(frame, [0, durationInFrames], [p.zoom, p.zoomTo]) : p.kenBurns ? kb : p.zoom;
  const ox = p.zx ?? p.fx;
  const oy = p.zy ?? p.fy;
  const clip = (
    <OffthreadVideo
      src={media(p.src)}
      trimBefore={Math.round(p.from * fps)}
      muted
      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${p.fx * 100}% ${p.fy * 100}%` }}
    />
  );
  if (p.frame === 'monitor') return <Monitor progress={frame / Math.max(1, durationInFrames - 1)} source={p.source}>{clip}</Monitor>;
  return (
    <AbsoluteFill style={{ background: '#000000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: `${ox * 100}% ${oy * 100}%` }}>
        {clip}
      </AbsoluteFill>
      <Scrim height={p.headline ? '62%' : '38%'} />
      {p.headline ? <Headline {...p.headline} /> : null}
      {p.source ? <Source text={p.source} onPhoto /> : null}
    </AbsoluteFill>
  );
};

// Screen mockup: dark bezel, 16:9 screen with a progress bar, stand, on a light surface.
// Makes it immediately clear that another video is being shown.
const Monitor: React.FC<{ children: React.ReactNode; progress: number; source?: string }> = ({ children, progress, source }) => {
  const { width, height } = useVideoConfig();
  const pin = useIn(0, 18);
  const sw = Math.min(width * 0.84, height * 0.62 * (16 / 9));
  const sh = (sw * 9) / 16;
  const bz = sw * 0.02;
  const neckW = sw * 0.12;
  const neckH = sw * 0.08;
  const baseW = sw * 0.34;
  const baseH = sw * 0.018;
  return (
    <AbsoluteFill style={{ background: C.surface, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...rise(pin, 40) }}>
        <div style={{ padding: bz, background: S.gray900, borderRadius: bz * 1.6, boxShadow: SHADOW_CARD }}>
          <div style={{ position: 'relative', width: sw, height: sh, borderRadius: bz * 0.5, overflow: 'hidden', background: '#000000' }}>
            {children}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: sh * 0.012, background: 'rgba(255,255,255,0.35)' }}>
              <div style={{ width: `${Math.min(1, progress) * 100}%`, height: '100%', background: C.brand }} />
            </div>
          </div>
        </div>
        <div style={{ width: neckW, height: neckH, background: S.gray300 }} />
        <div style={{ width: baseW, height: baseH, background: S.gray300, borderRadius: baseH }} />
      </div>
      {source ? <Source text={source} onPhoto={false} /> : null}
    </AbsoluteFill>
  );
};

// Headline on the image: one fact, large, bottom left, white on the gradient, no box.
// Replaces the standalone Statement card in Shorts, which looked empty on the light surface.
const Headline: React.FC<{ label?: string; value: string; caption?: string; f: number; cf?: number; accent: boolean }> = ({ label, value, caption, f, cf, accent }) => {
  const { width, height } = useVideoConfig();
  const pv = useIn(f, 10);
  const pc = useIn(cf ?? (f < 0 ? -1 : f + 8), 10);
  const size = value.length > 12 ? 170 : 240;
  return (
    <div style={{ position: 'absolute', left: 96, right: 96, bottom: 150, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {label ? <div style={{ ...t(76, 600, 'rgba(255,255,255,0.88)', { whiteSpace: 'normal' }), ...rise(f < 0 ? 1 : pv, 30) }}>{label}</div> : null}
      <div style={{ ...t(size, 700, accent ? C.brand : '#FFFFFF', { whiteSpace: 'normal', lineHeight: 1.0, maxWidth: width - 192 }), textShadow: '0 6px 40px rgba(0,0,0,0.35)', ...rise(pv, 50) }}>
        {value}
      </div>
      {caption ? <div style={{ ...t(64, 500, 'rgba(255,255,255,0.88)', { whiteSpace: 'normal', maxWidth: Math.min(width - 192, height * 1.2) }), ...rise(pc, 30) }}>{caption}</div> : null}
    </div>
  );
};
