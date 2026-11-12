/**
 * All brand files in ONE place. To rebrand, replace the files in brand/ and
 * keep the file names – no component code needs to change.
 */
import logoDark from '../../brand/logos/logo-dark.svg';
import logoAccent from '../../brand/logos/logo-accent.svg';
import logoWhite from '../../brand/logos/logo-white.svg';
import markDark from '../../brand/logos/mark-dark.svg';
import markAccent from '../../brand/logos/mark-accent.svg';
import markWhite from '../../brand/logos/mark-white.svg';
import wordDark from '../../brand/logos/wordmark-dark.svg';
import wordAccent from '../../brand/logos/wordmark-accent.svg';
import wordWhite from '../../brand/logos/wordmark-white.svg';
import samplePhoto from '../../brand/media/sample-photo.jpg';
import channelAvatar from '../../brand/logos/channel-avatar.svg';
import { brandFiles } from './brand-files';

/** Usable in media props via "brand:<name>" (e.g. src: "brand:sample-photo") */
export const brandMedia = {
  /** Placeholder photo (2880×2000) used by component samples */
  'sample-photo': samplePhoto,
  /** Channel avatar, used by SubscribeButton and EndCard */
  'channel-avatar': channelAvatar,
  'logo-accent': logoAccent,
  'logo-white': logoWhite,
  'logo-dark': logoDark,
  'mark-accent': markAccent,
  'mark-white': markWhite,
  'mark-dark': markDark,
  'wordmark-accent': wordAccent,
  'wordmark-white': wordWhite,
  'wordmark-dark': wordDark,
};
export type BrandMediaName = keyof typeof brandMedia;

/**
 * Sound effects: every .mp3/.wav in brand/sfx/, keyed by file name (whoosh_in.mp3 → "whoosh_in").
 * These names are used under "sfx" in edl.json. The folder starts empty; the names the pipeline and
 * components look for are listed in brand/sfx/README.md. A missing sound is simply not played.
 */
export const sfx: Record<string, string> = Object.fromEntries(brandFiles('sfx').map((f) => [f.name, f.url]));
export type SfxName = string;
