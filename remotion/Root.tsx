import React from 'react';
import { AbsoluteFill, Composition, Folder, useVideoConfig } from 'remotion';
import type { Timeline } from '../pipeline/schemas/timeline';
import { componentNames, defs } from './components/defs';
import type { ComponentMeta, Layout } from './components/types';
import { Placed } from './lib/Design';
import { EMPTY_TIMELINE, Main } from './Main';

const FPS = 25;

/** Neutral speaker stand-in for the catalog (dark backdrop) */
const SpeakerStandIn: React.FC<{ split: boolean }> = ({ split }) => {
  const { width: W, height: H } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: '#3B2F27' }}>
      <div style={{ position: 'absolute', left: (split ? 0.782 : 0.5) * W - W * 0.13, bottom: 0, width: W * 0.26, height: H * 0.62, borderRadius: `${W * 0.13}px ${W * 0.13}px 0 0`, background: '#1D1B19' }} />
    </AbsoluteFill>
  );
};

/** Catalog composition: component in its default layout, as it appears in a video */
const catalogComponent = (name: string, layout: Layout) => {
  const C: React.FC<Record<string, unknown>> = (props) => {
    const { width: W, height: H } = useVideoConfig();
    const portrait = H > W;
    const meta = defs[name as keyof typeof defs].meta as ComponentMeta;
    const showSpeaker = layout === 'overlay' || layout === 'split' || (portrait && meta.portrait === 'native');
    return (
      <AbsoluteFill>
        {showSpeaker && <SpeakerStandIn split={layout === 'split' && !portrait} />}
        <Placed name={name} props={props} layout={portrait && meta.portrait !== 'overlay' ? 'full' : layout} W={W} H={H} />
      </AbsoluteFill>
    );
  };
  C.displayName = `Catalog(${name})`;
  return C;
};

const landscape = componentNames.map((name) => {
  const meta = defs[name].meta as ComponentMeta;
  return { name, meta, layout: meta.layouts[0], component: catalogComponent(name, meta.layouts[0]) };
});
const portraitList = componentNames
  .filter((name) => (defs[name].meta as ComponentMeta).portrait !== false)
  .map((name) => {
    const meta = defs[name].meta as ComponentMeta;
    const layout: Layout = meta.portrait === 'overlay' ? 'overlay' : 'full';
    return { name, meta, layout, component: catalogComponent(name, layout) };
  });

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Main"
      component={Main}
      defaultProps={EMPTY_TIMELINE}
      durationInFrames={EMPTY_TIMELINE.durationInFrames}
      fps={EMPTY_TIMELINE.fps}
      width={EMPTY_TIMELINE.width}
      height={EMPTY_TIMELINE.height}
      calculateMetadata={({ props }: { props: Timeline }) => ({
        durationInFrames: props.durationInFrames,
        fps: props.fps,
        width: props.width,
        height: props.height,
      })}
    />
    <Folder name="Catalog-16x9">
      {landscape.map((c) => (
        <Composition
          key={c.name}
          id={`Catalog-${c.name}-16x9`}
          component={c.component}
          schema={defs[c.name].schema as never}
          defaultProps={defs[c.name].sample as never}
          durationInFrames={Math.round(c.meta.seconds * FPS)}
          fps={FPS}
          width={1920}
          height={1080}
        />
      ))}
    </Folder>
    <Folder name="Catalog-9x16">
      {portraitList.map((c) => (
        <Composition
          key={c.name}
          id={`Catalog-${c.name}-9x16`}
          component={c.component}
          schema={defs[c.name].schema as never}
          defaultProps={defs[c.name].sample as never}
          durationInFrames={Math.round(c.meta.seconds * FPS)}
          fps={FPS}
          width={1080}
          height={1920}
        />
      ))}
    </Folder>
  </>
);
