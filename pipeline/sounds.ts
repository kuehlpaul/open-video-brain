/**
 * Searches freely licensed sound effects and music and downloads candidates.
 *   npm run sounds -- <slug> --query "door creak" [--query "old door"] [--kind sfx|music] [--name door] [--n 5]
 *   npm run sounds -- <slug> --pick <name>:<nr>      candidate no. → work/assets/<name>.<ext> (+ .json with license/credit)
 *
 * Sources: projects/_library/music (music only), Openverse (no key), Freesound (FREESOUND_API_KEY, SFX),
 * Coverr (COVERR_API_KEY, music only).
 * Only licenses that allow commercial use and editing (CC0, public domain, CC BY, CC BY-SA). CC BY needs the
 * credit in the video description – it is in the candidate's .json. Generate instead: npm run generate -- <slug> --type audio.
 *
 * Use: music → "music": { "file": "work/assets/<name>.mp3" } in edl.json. Sound effects in the edit come from
 * brand/sfx (names in edl.json "sfx"); a find that should become part of the brand goes there under a new name.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadProject, parseCli } from './lib/cli';
import { log, main } from './lib/log';
import {
  availableAudioProviders, downloadAudio, searchCoverrAudio, searchFreesound, searchLibraryAudio, searchOpenverseAudio,
  type AudioHit, type AudioKind,
} from './lib/media-search';
import { ensureDir, readJson, rootRel, writeJson } from './lib/paths';

const USAGE = 'npm run sounds -- <slug> --query "<words>" [--query …] [--kind sfx|music] [--name <name>] [--n 5]  |  --pick <name>:<nr>';

type Entry = { file: string; provider: string; url: string; license: string; credit: string; title: string; duration?: number };
type Index = Record<string, { kind: AudioKind; queries: string[]; candidates: Entry[] }>;

main(async () => {
  const { values, positionals } = parseCli(USAGE, {
    query: { type: 'string', multiple: true },
    kind: { type: 'string', default: 'sfx' },
    name: { type: 'string' },
    n: { type: 'string', default: '5' },
    pick: { type: 'string' },
  });
  const { paths } = loadProject(positionals[0], USAGE);
  const indexFile = path.join(paths.work, 'sounds.json');
  const index: Index = fs.existsSync(indexFile) ? readJson<Index>(indexFile) : {};

  if (values.pick) {
    const [name, nr] = values.pick.split(':');
    const cand = index[name]?.candidates[Number(nr) - 1];
    if (!cand) throw new Error(`Candidate not found: ${values.pick} (format <name>:<nr>, numbers start at 1; list: work/sounds-candidates.md)`);
    if (cand.provider === 'library') {
      log.ok(`${name}: ${cand.file} (library – reference it directly)`);
      return;
    }
    const abs = path.resolve(paths.dir, cand.file);
    const dest = path.join(ensureDir(paths.assets), `${name}${path.extname(abs)}`);
    fs.copyFileSync(abs, dest);
    const side = abs.replace(/\.[^.]+$/, '.json');
    if (fs.existsSync(side)) fs.copyFileSync(side, dest.replace(/\.[^.]+$/, '.json'));
    const rel = path.relative(paths.dir, dest).split(path.sep).join('/');
    log.ok(`${rel}  (${cand.credit})`);
    if (index[name].kind === 'music') log.info(`edl.json: "music": { "file": "${rel}", "fadeIn": 0, "fadeOut": 2.5 }`);
    if (/BY/.test(cand.license)) log.warn('CC BY: put the credit line into the video description.');
    return;
  }

  const queries = values.query ?? [];
  if (!queries.length) throw new Error(`--query missing.\n  ${USAGE}`);
  if (values.kind !== 'sfx' && values.kind !== 'music') throw new Error('--kind must be sfx or music');
  const kind = values.kind as AudioKind;
  const name = values.name ?? queries[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error('--name: only a-z, 0-9, -');
  const n = Math.max(1, Number(values.n) || 5);

  const providers = availableAudioProviders();
  log.step(`Searching ${kind}: ${providers.join(', ')}${providers.includes('freesound') ? '' : '  (Freesound needs FREESOUND_API_KEY in .env)'}`);
  const hits: AudioHit[] = kind === 'music' ? searchLibraryAudio(queries) : [];
  for (const q of queries) {
    const jobs: Array<Promise<AudioHit[]>> = [searchOpenverseAudio(q, kind)];
    if (providers.includes('freesound')) jobs.push(searchFreesound(q, kind));
    if (providers.includes('coverr') && kind === 'music') jobs.push(searchCoverrAudio(q, kind));
    for (const r of await Promise.allSettled(jobs)) {
      if (r.status === 'fulfilled') hits.push(...r.value);
      else log.warn(`"${q}": ${r.reason instanceof Error ? r.reason.message : r.reason}`);
    }
  }
  const seen = new Set<string>();
  const unique = hits.filter((h) => {
    const k = h.localAbs ?? h.url;
    return seen.has(k) ? false : (seen.add(k), true);
  });
  // library first, then the sources take turns
  const lib = unique.filter((h) => h.provider === 'library');
  const rest = unique.filter((h) => h.provider !== 'library');
  const byProvider = new Map<string, AudioHit[]>();
  for (const h of rest) byProvider.set(h.provider, [...(byProvider.get(h.provider) ?? []), h]);
  const groups = [...byProvider.values()];
  const mixed: AudioHit[] = [];
  for (let i = 0; mixed.length < rest.length; i++) for (const g of groups) if (g[i]) mixed.push(g[i]);
  const top = [...lib, ...mixed].slice(0, n);

  const candidates: Entry[] = [];
  for (const [i, h] of top.entries()) {
    try {
      const file = h.localAbs ?? (await downloadAudio(h, path.join(ensureDir(path.join(paths.assets, 'candidates', 'audio')), `${name}-${i + 1}`)));
      candidates.push({ file: path.relative(paths.dir, file).split(path.sep).join('/'), provider: h.provider, url: h.url, license: h.license, credit: h.credit, title: h.title, duration: h.duration });
    } catch (e) {
      log.warn(e instanceof Error ? e.message : String(e));
    }
  }
  index[name] = { kind, queries, candidates };
  writeJson(indexFile, index);

  const lines = ['# Sound candidates', '', 'Listen, then pick: `npm run sounds -- <slug> --pick <name>:<nr>`. CC BY → credit in the video description.', ''];
  for (const [k, v] of Object.entries(index)) {
    lines.push(`## ${k} (${v.kind}) – ${v.queries.join(' · ')}`, '');
    v.candidates.forEach((c, j) => lines.push(`${j + 1}. \`${c.file}\` · ${c.provider} · ${c.license}${c.duration ? ` · ${c.duration.toFixed(1)} s` : ''} · ${c.credit || c.title}${c.url ? ` · ${c.url}` : ''}`));
    if (!v.candidates.length) lines.push(`Nothing found. Other words, or generate: \`npm run generate -- <slug> --type audio --prompt "…" --name ${k}\``);
    lines.push('');
  }
  fs.writeFileSync(path.join(paths.work, 'sounds-candidates.md'), lines.join('\n'));
  log[candidates.length ? 'ok' : 'warn'](`${name}: ${candidates.length} candidate(s) → ${rootRel(path.join(paths.work, 'sounds-candidates.md'))}`);
});
