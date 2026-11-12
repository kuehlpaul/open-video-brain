/**
 * Design tokens. brand.json is the source of truth – this file only adds types.
 * Components do NOT import from here but from remotion/look (which provides
 * the short names C, S, t() …).
 */
import brandJson from './brand.json';

export const brand = brandJson;
export const look = brand.look;
export const palette = brand.colors;
export const design = brand.design;
export const layout = brand.layout;
export const pacing = brand.pacing;
export const audioTargets = brand.audio;
export const sound = brand.sound;

export const dbToGain = (db: number) => Math.pow(10, db / 20);
