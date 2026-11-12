import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repo root. Everything is resolved relative to it and never stored as an absolute path. */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PROJECTS = path.join(ROOT, 'projects');
export const LIBRARY = path.join(PROJECTS, '_library');
export const BRAND = path.join(ROOT, 'brand');
export const REMOTION_ENTRY = path.join(ROOT, 'remotion', 'index.ts');

export const VIDEO_EXT = ['.mp4', '.mov', '.m4v', '.mkv', '.webm', '.mxf'];
export const AUDIO_EXT = ['.wav', '.mp3', '.m4a', '.aac', '.flac'];
export const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp'];

export type ProjectPaths = ReturnType<typeof projectPaths>;

/**
 * Finds a project's folder. Slugs stay flat IDs, the folder may be nested:
 *   projects/<slug>/                      single video (flat)
 *   projects/<video>/longform/            longform of a video (slug = <video>)
 *   projects/<video>/shorts/<name>/       its shorts (slug e.g. <video>-short-<name>)
 * Matched via `slug` in project.json.
 */
export function projectDir(slug: string): string {
  const flat = path.join(PROJECTS, slug);
  if (fs.existsSync(path.join(flat, 'project.json'))) return flat;
  const matches = (d: string) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(d, 'project.json'), 'utf8')).slug === slug;
    } catch {
      return false;
    }
  };
  const sub = (d: string) =>
    fs.existsSync(d) ? fs.readdirSync(d).filter((n) => !n.startsWith('.')).map((n) => path.join(d, n)) : [];
  for (const group of sub(PROJECTS)) {
    if (path.basename(group).startsWith('_')) continue;
    const candidates = [path.join(group, 'longform'), ...sub(path.join(group, 'shorts'))];
    const hit = candidates.find(matches);
    if (hit) return hit;
  }
  return flat; // does not exist → caller reports "project does not exist"
}

export function projectPaths(slug: string) {
  const dir = projectDir(slug);
  const work = path.join(dir, 'work');
  return {
    slug,
    dir,
    config: path.join(dir, 'project.json'),
    footage: path.join(dir, 'input', 'footage'),
    script: path.join(dir, 'input', 'script.md'),
    work,
    footageIndex: path.join(work, 'footage.json'),
    transcripts: path.join(work, 'transcripts'),
    audioProxy: path.join(work, 'audio-proxy'),
    audio: path.join(work, 'audio'),
    voice: path.join(work, 'voice'),
    voiceManifest: path.join(work, 'voice', 'manifest.json'),
    assets: path.join(work, 'assets'),
    candidatesJson: path.join(work, 'candidates.json'),
    candidatesMd: path.join(work, 'candidates.md'),
    edl: path.join(work, 'edl.json'),
    timeline: path.join(work, 'timeline.json'),
    render: path.join(work, 'render'),
    qa: path.join(work, 'qa'),
    output: path.join(dir, 'output'),
  };
}

/** Path relative to projects/ with forward slashes – the way Remotion (staticFile) expects it. */
export function publicRel(absPath: string): string {
  const rel = path.relative(PROJECTS, absPath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`File is outside projects/ and not reachable for Remotion: ${absPath}`);
  }
  return rel.split(path.sep).join('/');
}

export function fromPublicRel(rel: string): string {
  return path.join(PROJECTS, ...rel.split('/'));
}

export function rootRel(absPath: string): string {
  return path.relative(ROOT, absPath).split(path.sep).join('/');
}

export function ensureDir(dir: string): string {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function baseName(file: string): string {
  return path.basename(file, path.extname(file));
}

/** Lists the files of a folder, ignoring macOS junk (._*, .DS_Store). */
export function listFiles(dir: string, exts?: string[]): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => !f.startsWith('.') && !f.startsWith('._'))
    .filter((f) => fs.statSync(path.join(dir, f)).isFile())
    .filter((f) => !exts || exts.includes(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

export function readJson<T = unknown>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

export function writeJson(file: string, data: unknown): void {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}
