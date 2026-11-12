/**
 * The house style – shared building blocks for every graphic.
 *
 * Conventions for components:
 *  - Built in DESIGN PIXELS. Inside a component, useVideoConfig() returns the
 *    design surface (panel 2228×2160, full frame 3840×2160, portrait stage 2160×2180 …),
 *    not the render size. <Design> in Main.tsx handles the scaling.
 *  - Cue props (f, xF, …) are frames relative to the component start. f < 0 = visible from frame 0.
 *  - Media props (src) are paths relative to projects/ OR "brand:<name>" (see media()).
 */
import React from 'react';
import { Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { brand } from '../../brand/tokens';
import { brandMedia } from '../lib/assets';

export const fontFamily = `${brand.typography.family}, system-ui, -apple-system, Helvetica, Arial, sans-serif`;

// ---------- Colors ----------
const p = brand.colors.primary;
const g = brand.colors.gray;
/** Short names for the look tokens */
export const C = {
  surface: brand.look.surface,
  card: brand.look.card,
  border: brand.look.border,
  heading: brand.look.heading,
  text: brand.look.text,
  muted: brand.look.muted,
  gray400: g['400'],
  gray300: g['300'],
  gray700: g['700'],
  track: brand.look.track,
  brand: brand.look.brand,
  brandDark: p['800'],
  brand700: p['700'],
  brand300: p['300'],
  onAccentSoft: brand.look.onAccentSoft,
  onAccentMuted: brand.look.onAccentMuted,
  white: '#FFFFFF',
  error: brand.colors.error,
};
/** Full website color scale */
export const S = {
  bg: g['25'], gray50: g['50'], gray100: g['100'], gray200: g['200'], gray300: g['300'], gray400: g['400'],
  gray500: g['500'], gray600: g['600'], gray700: g['700'], gray900: g['900'],
  accent: p['600'], accent200: p['200'], accent300: p['300'], accent400: p['400'], accent500: p['500'], accent700: p['700'], accent25: p['25'], accent50: p['50'], white: '#FFFFFF',
};
export const BAR = brand.look.bar;
export const STAGE = brand.look.stage;
export const SCRIM = brand.look.scrim;
export const SHADOW_CARD = brand.look.shadowCard;

/** Website scale: K = 2.4 × website px, KC for content blocks */
export const K = 2.4;
export const KC = K * 1.45;
export const CHIP_SHADOW = `0 ${5 * K}px ${16 * K}px ${-12 * K}px rgba(0,0,0,0.2)`;
export const CARD_SHADOW = `0 ${12 * K}px ${32 * K}px ${-14 * K}px rgba(16,24,40,0.22)`;

// ---------- Type ----------
/** Heading style: Inter, −0.02 em tracking, line height 1.1, no wrapping (override via extra) */
export const t = (size: number, weight: 400 | 500 | 600 | 700 | 800 | 900 = 600, color: string = C.heading, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily, fontSize: size, fontWeight: weight, color, letterSpacing: '-0.02em', lineHeight: 1.1, whiteSpace: 'nowrap', ...extra,
});
/** Body text (website style) */
export const txt = (size: number, weight: 400 | 500 | 600 | 700 = 400, color: string = S.gray600, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily, fontSize: size, fontWeight: weight, color, lineHeight: 1.25, ...extra,
});
export const head = (size: number, extra: React.CSSProperties = {}): React.CSSProperties =>
  txt(size, 600, S.gray900, { letterSpacing: '-0.02em', lineHeight: 1.12, ...extra });
export const strike = (px: number): React.CSSProperties => ({ textDecoration: 'line-through', textDecorationThickness: px });

// ---------- Motion ----------
export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const calm = { ...clamp, easing: Easing.bezier(0.22, 1, 0.36, 1) };
/** Enter progress 0→1 from frame f; f < 0 = already visible */
export const useIn = (f: number, len = brand.motion.enterFrames) => {
  const frame = useCurrentFrame();
  return f < 0 ? 1 : interpolate(frame, [f, f + len], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
};
export const useP = useIn;
export const rise = (pr: number, dy = brand.motion.riseDistance): React.CSSProperties => ({ opacity: pr, transform: `translateY(${dy * (1 - pr)}px)` });
/** Ken Burns 100 → 104 % over the duration */
export const useKenBurns = (base = 1, to = brand.motion.kenBurns) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return base * interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [1, to]);
};

// ---------- Media ----------
/** Media URL: "brand:<name>" → brand file (remotion/lib/assets.ts), otherwise a path relative to projects/ */
export const media = (src: string): string => {
  if (src.startsWith('brand:')) {
    const u = brandMedia[src.slice(6) as keyof typeof brandMedia];
    if (!u) throw new Error(`Unknown brand media: ${src}`);
    return u;
  }
  return staticFile(src);
};

// ---------- Surfaces ----------
/** Stage: light surface, content vertically centered */
export const Stage: React.FC<{ children: React.ReactNode; bg?: string }> = ({ children, bg = C.surface }) => (
  <div style={{ position: 'absolute', inset: 0, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>{children}</div>
  </div>
);

/** Grows from 0 to h when it appears – the centered block shifts smoothly along */
export const Grow: React.FC<{ f: number; h: number; gap?: number; first?: boolean; children: React.ReactNode }> = ({ f, h, gap = 56, first, children }) => {
  const pr = useIn(f, 18);
  if (pr <= 0) return null;
  return (
    <div style={{ height: h * pr + (first ? 0 : gap * pr), display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'visible' }}>
      <div style={{ height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', ...rise(pr, 36) }}>{children}</div>
    </div>
  );
};

/** Card: white with a 3 px border, or accent-filled (Statement), centered on the surface */
export const Shell: React.FC<{ children: React.ReactNode; w?: number; h?: number; accent?: boolean; gap?: number }> = ({ children, w = 1500, h = 1000, accent, gap }) => {
  const { width, height } = useVideoConfig();
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.surface }}>
      <div
        style={{
          position: 'absolute', left: (width - w) / 2, top: (height - h) / 2 + 30, width: w, height: h, boxSizing: 'border-box',
          background: accent ? C.brand : '#FFFFFF', border: accent ? `6px solid ${C.onAccentMuted}` : `3px solid ${C.border}`,
          borderRadius: 56, boxShadow: SHADOW_CARD, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap, overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Box for list items: white, active = accent */
export const boxStyle = (on: boolean, radius = 44): React.CSSProperties => ({
  borderRadius: radius, boxSizing: 'border-box',
  background: on ? C.brand : '#FFFFFF', border: on ? `6px solid ${C.onAccentMuted}` : `3px solid ${C.border}`, boxShadow: on ? SHADOW_CARD : undefined,
});

/** Source credit, bottom left: white on photos, gray on surfaces. Rule: credits only on photos. */
export const Source: React.FC<{ text: string; onPhoto: boolean }> = ({ text, onPhoto }) => {
  const { height } = useVideoConfig();
  return (
    <div style={{ position: 'absolute', left: 64, top: height - 40 - 44, fontFamily, fontWeight: 500, fontSize: 36, lineHeight: '44px', color: onPhoto ? 'rgba(255,255,255,0.85)' : C.muted, whiteSpace: 'nowrap' }}>
      {text}
    </div>
  );
};

export const Scrim: React.FC<{ height?: string }> = ({ height = '22%' }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height, background: SCRIM }} />
);

// ---------- Icons (line icons, 24 px grid) ----------
export type IconName = 'check' | 'x' | 'bolt' | 'payment' | 'docCheck' | 'camera' | 'form' | 'truck' | 'car' | 'news' | 'play' | 'globe' | 'user' | 'pin' | 'clock' | 'trend' | 'info' | 'gavel' | 'bell';
const ICONS: Record<IconName, React.ReactNode> = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M7 7l10 10M17 7L7 17" />,
  bolt: <path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12L13 2z" fill="currentColor" stroke="none" />,
  payment: <><path d="M4 8V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5V16" /><path d="M3 12h10M10 9l3 3-3 3" /></>,
  docCheck: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 14l2 2 4-4" /></>,
  camera: <><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.5-2h5L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" /><circle cx="12" cy="12.5" r="3.2" /></>,
  form: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h8M8 17h4" /></>,
  truck: <><path d="M3 6.5h11v9.5H3zM14 10h3.5l3.5 3.5V16h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
  car: <><path d="M5 15.5v-3l2-5h10l2 5v3a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" /><path d="M5 12.5h14M7.5 16.5v2M16.5 16.5v2" /></>,
  news: <><path d="M5 5h11v14H6a1 1 0 0 1-1-1z" /><path d="M16 9h3v8.5a1.5 1.5 0 0 1-3 0M8 9h5M8 12h5M8 15h3" /></>,
  play: <><rect x="3" y="5" width="18" height="14" rx="3.5" /><path d="M10.5 9.5l4 2.5-4 2.5z" fill="currentColor" /></>,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.6 3 2.6 14 0 17M12 3.5c-2.6 3-2.6 14 0 17" /></>,
  user: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5.5 19.5c1-3.6 3.7-5.5 6.5-5.5s5.5 1.9 6.5 5.5" /></>,
  pin: <><path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z" /><circle cx="12" cy="10.5" r="2.3" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  trend: <path d="M3 16.5l5.5-5.5 4 4L21 6.5M16 6.5h5v5" />,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></>,
  gavel: <><path d="M13.5 5.5l5 5M11 8l5 5M12.5 6.5l4-4 5 5-4 4M7 21l8-8" /><path d="M3 21h9" /></>,
  bell: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
};
export const iconNames = Object.keys(ICONS) as IconName[];
export const Icon: React.FC<{ name: IconName; size: number; color?: string; stroke?: number }> = ({ name, size, color = S.gray700, stroke = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ color, flexShrink: 0, display: 'block' }}>
    {ICONS[name]}
  </svg>
);

/** Accent icon square */
export const IconSquare: React.FC<{ icon: IconName; size: number; on?: boolean }> = ({ icon, size, on = true }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.22, background: on ? S.accent : S.gray200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    boxShadow: on ? `inset 0 ${-size * 0.06}px 0 rgba(0,0,0,0.06)` : undefined }}>
    <Icon name={icon} size={size * 0.52} color={on ? S.white : S.gray400} stroke={2} />
  </div>
);

/** White chip (eyebrow style) – do NOT use as an accent badge above graphics */
export const Eyebrow: React.FC<{ icon?: IconName; text: string; p?: number }> = ({ icon, text, p: pr = 1 }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6.4 * K, padding: `${4.8 * K}px ${12.8 * K}px`, background: S.white, border: `${K}px solid ${S.gray200}`,
    borderRadius: 12.8 * K, boxShadow: CHIP_SHADOW, ...rise(pr, 20) }}>
    {icon ? <Icon name={icon} size={20 * K} color={S.gray700} /> : null}
    <div style={txt(16 * K, 400, S.gray600, { lineHeight: `${24 * K}px`, whiteSpace: 'nowrap' })}>{text}</div>
  </div>
);

/** false when the brand has no logo (brand.json → logo.enabled, set by `npm run brand -- --no-logo`). */
export const hasLogo = brand.logo.enabled;

/** Logo as an image (brand/logos). part: full logo, symbol only (mark) or lettering only (wordmark). Renders nothing without a logo. */
export const Logo: React.FC<{ variant?: 'accent' | 'white' | 'dark'; part?: 'logo' | 'mark' | 'wordmark'; width: number; style?: React.CSSProperties }> = ({
  variant = 'accent',
  part = 'logo',
  width,
  style,
}) => (hasLogo ? <Img src={brandMedia[`${part}-${variant}`]} style={{ width, ...style }} /> : null);
