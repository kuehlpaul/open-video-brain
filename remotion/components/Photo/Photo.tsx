// Full-surface photo: (fx, fy) = image point in the center of the surface, the image always covers the surface
// (edges are clamped), Ken Burns 1 → 1.04 around the focus, scrim at the bottom. contain = whole image on white.
// No chips on photos. Source credits only on photos.
import React from 'react';
import { AbsoluteFill, Img, useVideoConfig } from 'remotion';
import { C, Scrim, Source, media, useKenBurns } from '../../look';
import { schema, type Props } from './def';

export const Photo: React.FC<Props> = (raw) => {
  const p = schema.parse(raw);
  const { width: W, height: H } = useVideoConfig();
  const kb = useKenBurns();
  const url = media(p.src);

  let img: React.ReactNode;
  if (p.contain) {
    img = (
      <AbsoluteFill style={{ transform: `scale(${p.zoom * kb})`, padding: p.pad }}>
        <Img src={url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </AbsoluteFill>
    );
  } else if (p.iw && p.ih) {
    const s = Math.max(W / p.iw, H / p.ih) * p.zoom * kb;
    const dw = p.iw * s;
    const dh = p.ih * s;
    const left = Math.min(0, Math.max(W - dw, W / 2 - p.fx * dw));
    const top = Math.min(0, Math.max(H - dh, H / 2 - p.fy * dh));
    img = <Img src={url} style={{ position: 'absolute', left, top, width: dw, height: dh }} />;
  } else {
    // Without image size: object-fit cover, zoom around the focus
    const origin = `${p.fx * 100}% ${p.fy * 100}%`;
    img = (
      <AbsoluteFill style={{ transform: `scale(${p.zoom * kb})`, transformOrigin: origin }}>
        <Img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: origin }} />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: p.contain ? '#FFFFFF' : C.surface, overflow: 'hidden' }}>
      {img}
      {p.contain ? (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 300, background: 'linear-gradient(0deg, #FFFFFF 45%, rgba(255,255,255,0))' }} />
      ) : (
        <Scrim />
      )}
      {p.source ? <Source text={p.source} onPhoto={!p.contain} /> : null}
    </AbsoluteFill>
  );
};
