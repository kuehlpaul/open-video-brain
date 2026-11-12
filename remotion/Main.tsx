/**
 * The one composition that renders every video: reads the timeline (props)
 * and assembles speaker, B-roll, graphics (split/full/overlay), captions, music and sounds.
 * No styling here – styling lives in components/ and look/.
 */
import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { brand } from '../brand/tokens';
import type { Timeline, TimelineClip } from '../pipeline/schemas/timeline';
import { Captions } from './components/Captions/Captions';
import { sfx as sfxFiles } from './lib/assets';
import { Design, Placed, hidesSpeaker } from './lib/Design';
import { C } from './look';

type Range = { from: number; to: number; mode: 'hide' | 'split'; focusX?: number };

/** 1-frame fade at every cut to avoid clicks */
const edgeFade = (duration: number, volume = 1) => (f: number) =>
  duration < 4 ? volume : interpolate(f, [0, 1, duration - 1, duration], [0, volume, volume, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

const FootageClip: React.FC<{ clip: TimelineClip; ranges: Range[] }> = ({ clip, ranges }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H, fps } = useVideoConfig();
  const g = clip.from + frame;
  const r = ranges.find((x) => g >= x.from && g < x.to);
  const origin = `${clip.focusX * 100}% ${clip.focusY * 100}%`;
  let transform: string;
  let transformOrigin = '50% 50%';
  // Element size: normally fills the frame; in the 9:16 split the whole 16:9 image (otherwise object-fit crops before scaling down → black bars)
  let box: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: W, height: H };
  if (r?.mode === 'split' && H > W) {
    // 9:16 split: graphic on top, speaker below – scaled down, face at speakerFaceTargetY, head with room below the panel edge.
    const ps = brand.layout.portraitSplit;
    const k = ps.speakerScale * (1 + ps.speakerPush * ((g - r.from) / fps));
    const srcW = (H * 16) / 9;
    box = { position: 'absolute', left: (W - srcW) / 2, top: 0, width: srcW, height: H };
    // Face center from focusX (measured per segment): visible image center in full frame = focusX·(1−W/srcW) + W/srcW/2
    const vis = W / srcW;
    const faceX = (r.focusX ?? clip.focusX) * (1 - vis) + vis / 2;
    const dx = -(faceX - 0.5) * srcW * k;
    const dy = (ps.speakerFaceTargetY - ps.speakerFaceY) * H;
    transformOrigin = `50% ${ps.speakerFaceY * 100}%`;
    transform = `translate(${dx}px, ${dy}px) scale(${k})`;
  } else if (r?.mode === 'split') {
    // Speaker to the right of the panel: image center at speakerCenterX, scale 1 (crop L .251 / R .231, centerX .782)
    transform = `translateX(${(brand.layout.split.speakerCenterX - 0.5) * W}px)`;
  } else {
    const scale = clip.zoom * (1 + clip.push * (frame / fps));
    transform = `translateY(${(clip.centerY - 0.5) * H}px) scale(${scale})`;
  }
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#000' }}>
      <OffthreadVideo
        src={staticFile(clip.src!)}
        trimBefore={clip.trimBefore}
        muted={Boolean(clip.audioSrc)}
        volume={edgeFade(clip.duration, clip.volume)}
        style={{ ...box, objectFit: 'cover', objectPosition: origin, transform, transformOrigin, opacity: r?.mode === 'hide' ? 0 : 1 }}
      />
      {clip.audioSrc && <Audio src={staticFile(clip.audioSrc)} trimBefore={clip.audioTrimBefore} volume={edgeFade(clip.duration, clip.volume)} />}
    </AbsoluteFill>
  );
};

/** Graphic/voice segment: full-frame graphic or file, optionally with audio */
const GeneratedClip: React.FC<{ clip: TimelineClip }> = ({ clip }) => {
  const { width: W, height: H } = useVideoConfig();
  const v = clip.visual;
  let visual: React.ReactNode = null;
  if (v && 'component' in v) visual = <Placed name={v.component} props={v.props} layout="full" W={W} H={H} />;
  else if (v && 'src' in v) {
    visual = /\.(png|jpe?g|webp)$/i.test(v.src) ? (
      <Img src={staticFile(v.src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    ) : (
      <OffthreadVideo src={staticFile(v.src)} trimBefore={v.trimBefore} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    );
  }
  return (
    <AbsoluteFill style={{ background: C.surface }}>
      {visual}
      {clip.audioSrc && <Audio src={staticFile(clip.audioSrc)} volume={clip.volume} />}
    </AbsoluteFill>
  );
};

const BRollItem: React.FC<{ b: Timeline['broll'][number] }> = ({ b }) => {
  const { width: W, height: H } = useVideoConfig();
  const media = b.isImage ? (
    <Img src={staticFile(b.src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  ) : (
    <OffthreadVideo src={staticFile(b.src)} trimBefore={b.trimBefore} volume={b.volume} muted={b.volume === 0} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  );
  if (b.mode === 'full') return <AbsoluteFill>{media}</AbsoluteFill>;
  // pip = like a panel on the left
  const portrait = H > W;
  return <div style={{ position: 'absolute', left: 0, top: 0, width: portrait ? W : W * brand.layout.split.mediaShare, height: portrait ? H * 0.5 : H, overflow: 'hidden' }}>{media}</div>;
};

export const Main: React.FC<Timeline> = (t) => {
  const { width: W, height: H } = useVideoConfig();
  const portrait = H > W;

  const ranges = useMemo<Range[]>(() => {
    const r: Range[] = [];
    for (const o of t.overlays) {
      if (o.layout === 'overlay') continue;
      if (hidesSpeaker(o.component, o.layout, portrait)) r.push({ from: o.from, to: o.from + o.duration, mode: 'hide' });
      else if (o.layout === 'split') {
        // 9:16 split: one crop for the whole graphic (average of the cuts underneath), so the speaker doesn't jump at pause cuts
        const a = o.from;
        const b = o.from + o.duration;
        let sum = 0;
        let w = 0;
        for (const c of t.clips) {
          const ov = Math.min(b, c.from + c.duration) - Math.max(a, c.from);
          if (c.kind === 'footage' && ov > 0) {
            sum += c.focusX * ov;
            w += ov;
          }
        }
        r.push({ from: a, to: b, mode: 'split', focusX: w ? sum / w : undefined });
      }
    }
    for (const b of t.broll) if (b.mode === 'full') r.push({ from: b.from, to: b.from + b.duration, mode: 'hide' });
    return r;
  }, [t.overlays, t.broll, t.clips, portrait]);

  // Dark captions while a light full-frame graphic is on screen (9:16 full, except Video/B-roll) –
  // overlays as well as graphic/voice segments, which render a component full-frame on the light surface
  const darkRanges = useMemo<Array<[number, number]>>(() => {
    if (!portrait) return [];
    const overlays = t.overlays.filter((o) => o.layout === 'full' && o.component !== 'Video').map((o) => [o.from, o.from + o.duration] as [number, number]);
    const segments = t.clips
      .filter((c) => c.kind === 'generated' && c.visual && 'component' in c.visual && c.visual.component !== 'Video')
      .map((c) => [c.from, c.from + c.duration] as [number, number]);
    return [...overlays, ...segments];
  }, [t.overlays, t.clips, portrait]);
  // 9:16 split: captions lower (chest instead of mouth), because the speaker sits in the bottom half
  const lowRanges = useMemo<Array<[number, number]>>(
    () => (portrait ? t.overlays.filter((o) => o.layout === 'split').map((o) => [o.from, o.from + o.duration] as [number, number]) : []),
    [t.overlays, portrait],
  );

  const overlayDesign = portrait ? brand.design.portrait : brand.design.landscape;

  return (
    <AbsoluteFill style={{ background: C.surface }}>
      {t.clips.map((c) => (
        <Sequence key={c.id} name={c.id} from={c.from} durationInFrames={c.duration}>
          {c.kind === 'footage' ? <FootageClip clip={c} ranges={ranges} /> : <GeneratedClip clip={c} />}
        </Sequence>
      ))}
      {t.broll.map((b) => (
        <Sequence key={b.id} name={`B-Roll ${b.id}`} from={b.from} durationInFrames={b.duration}>
          <BRollItem b={b} />
        </Sequence>
      ))}
      {t.overlays
        .filter((o) => o.layout !== 'overlay')
        .map((o) => (
          <Sequence key={o.id} name={`${o.component} ${o.id}`} from={o.from} durationInFrames={o.duration}>
            <Placed name={o.component} props={o.props} layout={o.layout} W={W} H={H} />
          </Sequence>
        ))}
      {t.overlays
        .filter((o) => o.layout === 'overlay')
        .map((o) => (
          <Sequence key={o.id} name={`${o.component} ${o.id}`} from={o.from} durationInFrames={o.duration}>
            <Placed name={o.component} props={o.props} layout="overlay" W={W} H={H} />
          </Sequence>
        ))}
      {t.captions.enabled && t.captions.tokens.length > 0 && (
        <Design w={overlayDesign.width} h={overlayDesign.height} scale={W / overlayDesign.width}>
          <Captions style={t.captions.style} tokens={t.captions.tokens} darkRanges={darkRanges} lowRanges={lowRanges} lowY={brand.layout.portraitSplit.captionY} />
        </Design>
      )}
      {t.music.map((m, i) => (
        <Sequence key={`music-${i}`} name="Music" from={m.from} durationInFrames={m.duration} layout="none">
          <Audio
            src={staticFile(m.src)}
            loop={m.loop}
            trimBefore={m.trimBefore}
            volume={(f) => {
              // A bed shorter than its fades would give interpolate() a non-increasing range (it throws): shrink the fades to fit
              if (m.duration < 4) return m.volume;
              const fadeIn = Math.min(Math.max(1, m.fadeInFrames), Math.floor((m.duration - 1) / 2));
              const fadeOut = Math.min(Math.max(1, m.fadeOutFrames), m.duration - 1 - fadeIn);
              return interpolate(f, [0, fadeIn, m.duration - fadeOut, m.duration], [0, m.volume, m.volume, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
            }}
          />
        </Sequence>
      ))}
      {t.sfx.map((s, i) =>
        s.name in sfxFiles ? (
          <Sequence key={`sfx-${i}`} name={`SFX ${s.name}`} from={s.from} layout="none">
            <Audio src={sfxFiles[s.name]} volume={s.volume} />
          </Sequence>
        ) : null,
      )}
    </AbsoluteFill>
  );
};

/** Placeholder so that "Main" opens in the Studio without a project */
export const EMPTY_TIMELINE: Timeline = {
  version: 1,
  slug: 'empty',
  format: 'longform',
  fps: 25,
  width: 1920,
  height: 1080,
  durationInFrames: 75,
  clips: [],
  broll: [],
  overlays: [{ id: 'notice', component: 'Placeholder', layout: 'full', from: 0, duration: 75, props: { text: 'No project loaded: npm run preview -- <slug>' } }],
  captions: { enabled: false, style: 'longform', tokens: [] },
  music: [],
  sfx: [],
  chapters: [],
};
