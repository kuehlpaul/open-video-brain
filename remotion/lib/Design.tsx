import React from 'react';
import { Sequence, useVideoConfig } from 'remotion';
import { brand } from '../../brand/tokens';
import { defs, isComponentName } from '../components/defs';
import { registry } from '../components/registry';
import type { ComponentMeta, Layout } from '../components/types';
import { C, rise, t, useIn } from '../look';

/**
 * Renders children on a design surface (w×h design px) and scales them to the
 * real size. Inside, useVideoConfig() returns w/h – components build in design px.
 */
export const Design: React.FC<{ w: number; h: number; scale: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ w, h, scale, children, style }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `scale(${scale})`, transformOrigin: '0 0', overflow: 'hidden', ...style }}>
    <Sequence width={w} height={h} layout="none">
      {children}
    </Sequence>
  </div>
);

const d = brand.design;

/** Heading above any card (prop `heading` in the EDL): Inter 600, dark, centered at the top, no badge. */
const PanelHeading: React.FC<{ text: string }> = ({ text }) => {
  const { width } = useVideoConfig();
  const pr = useIn(0);
  return <div style={{ position: 'absolute', left: 0, top: 120, width, textAlign: 'center', ...t(104, 600, C.heading), ...rise(pr) }}>{text}</div>;
};

export const metaOf = (name: string): ComponentMeta | null => (isComponentName(name) ? (defs[name].meta as ComponentMeta) : null);

/**
 * A graphic in its layout. W×H = real render size.
 *  16:9 split   → panel on the left (mediaShare), design 2228×2160
 *  16:9 full    → full frame, design 3840×2160
 *  overlay      → transparent on top of everything, design 3840×2160 or 2160×3840
 *  9:16 split   → graphic in the top half on a light surface, speaker below (design 2080 wide)
 *  9:16 full    → graphic centered on a light surface over the full height (design 2080 wide)
 *  9:16 native  → built for portrait, design = meta.canvas
 */
export const Placed: React.FC<{ name: string; props: Record<string, unknown>; layout: Layout; W: number; H: number }> = ({ name, props, layout, W, H }) => {
  const meta = metaOf(name);
  if (!meta || !isComponentName(name)) return null;
  const Comp = registry[name];
  const portrait = H > W;
  const { heading, ...rest } = props as Record<string, unknown> & { heading?: string };
  const el = (
    <>
      <Comp {...rest} />
      {heading ? <PanelHeading text={heading} /> : null}
    </>
  );

  if (layout === 'overlay') {
    const dw = portrait ? d.portrait.width : d.landscape.width;
    const dh = portrait ? d.portrait.height : d.landscape.height;
    return <Design w={dw} h={dh} scale={W / dw}>{el}</Design>;
  }
  if (!portrait) {
    if (layout === 'split') {
      const s = H / d.panel.height;
      return (
        <div style={{ position: 'absolute', left: 0, top: 0, width: W * brand.layout.split.mediaShare, height: H, overflow: 'hidden', background: C.surface }}>
          <Design w={d.panel.width} h={d.panel.height} scale={s}>{el}</Design>
        </div>
      );
    }
    const cw = meta.canvas?.w ?? d.landscape.width;
    const ch = meta.canvas?.h ?? d.landscape.height;
    const s = Math.min(W / cw, H / ch);
    return (
      <div style={{ position: 'absolute', inset: 0, background: C.surface }}>
        <div style={{ position: 'absolute', left: (W - cw * s) / 2, top: (H - ch * s) / 2, width: cw * s, height: ch * s }}>
          <Design w={cw} h={ch} scale={s}>{el}</Design>
        </div>
      </div>
    );
  }
  // Portrait
  if (meta.portrait === 'native') {
    const cw = meta.canvas?.w ?? d.portrait.width;
    const ch = meta.canvas?.h ?? d.portrait.height;
    return <Design w={cw} h={ch} scale={W / cw}>{el}</Design>;
  }
  // stage: no dark gradient, no logo.
  //  split = graphic on top on a light surface (speaker below, see Main), full = content centered on a light surface.
  //  Design width 2080 instead of panel width 2228: cards appear ~7 % larger in portrait, List (1840) and the Tiles grid (1864) keep a margin.
  const ps = brand.layout.portraitSplit;
  const dw = ps.designWidth;
  const areaH = layout === 'split' ? H * ps.mediaShare : H;
  return (
    <Design w={dw} h={Math.round((dw * areaH) / W)} scale={W / dw} style={{ background: C.surface }}>
      {el}
    </Design>
  );
};

/** Does the graphic cover the speaker completely? (16:9 full, 9:16 full; 9:16 split keeps them visible below) */
export const hidesSpeaker = (name: string, layout: Layout, portrait: boolean): boolean => {
  const meta = metaOf(name);
  if (!meta || layout === 'overlay') return false;
  if (portrait && meta.portrait === 'native') return true;
  return layout === 'full';
};
