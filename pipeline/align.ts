/**
 * Matches script ↔ transcript: for every sentence in the script, finds the matching
 * takes in the footage (fuzzy match over word sequences). Claude picks from them.
 *   npm run align -- <slug> [--min 0.55]
 *
 * Writes work/candidates.json and work/candidates.md (human-readable).
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadProject, parseCli } from './lib/cli';
import { log, main } from './lib/log';
import { listFiles, readJson, writeJson } from './lib/paths';
import { lcs, normalizeToken, parseScript } from './lib/text';
import { Transcript } from './schemas/transcript';

const USAGE = 'npm run align -- <slug> [--min 0.55] [--top 4]';

type Candidate = { clip: string; start: number; end: number; score: number; heard: string; wordStart: number; wordEnd: number };

main(async () => {
  const { values, positionals } = parseCli(USAGE, {
    min: { type: 'string', default: '0.55' },
    top: { type: 'string', default: '4' },
  });
  const { paths, source } = loadProject(positionals[0], USAGE);
  const minScore = Number(values.min);
  const topN = Number(values.top);
  if (!fs.existsSync(paths.script)) throw new Error('input/script.md missing.');
  const script = parseScript(fs.readFileSync(paths.script, 'utf8'));
  if (!script.sentences.length) throw new Error('No spoken text found in the script.');

  const transcripts = listFiles(source.transcripts, ['.json']).map((f) =>
    Transcript.parse(readJson(path.join(source.transcripts, f))),
  );
  if (!transcripts.length) throw new Error('No transcripts – run npm run transcribe first');

  // token index across all clips
  const clips = transcripts.map((t) => {
    const words = t.words.filter((w) => w.type === 'word');
    return { t, words, tokens: words.map((w) => normalizeToken(w.text)) };
  });
  const freq = new Map<string, number>();
  for (const c of clips) for (const tok of c.tokens) freq.set(tok, (freq.get(tok) ?? 0) + 1);
  const positions = new Map<string, Array<[number, number]>>();
  clips.forEach((c, ci) => c.tokens.forEach((tok, wi) => {
    if (!positions.has(tok)) positions.set(tok, []);
    positions.get(tok)!.push([ci, wi]);
  }));

  log.step(`Matching ${script.sentences.length} sentences against ${clips.length} clips`);
  const results = script.sentences.map((s) => {
    const n = s.tokens.length;
    // rarest tokens of the sentence as anchors
    const anchors = s.tokens
      .map((tok, j) => ({ tok, j, f: freq.get(tok) ?? 0 }))
      .filter((a) => a.f > 0)
      .sort((a, b) => a.f - b.f)
      .slice(0, 3);
    const tried = new Set<string>();
    const found: Candidate[] = [];
    for (const a of anchors) {
      for (const [ci, wi] of positions.get(a.tok) ?? []) {
        const startIdx = Math.max(0, wi - a.j - 2);
        const key = `${ci}:${startIdx}`;
        if (tried.has(key)) continue;
        tried.add(key);
        const c = clips[ci];
        const window = c.tokens.slice(startIdx, startIdx + Math.ceil(n * 1.4) + 4);
        const { length, matchedB } = lcs(s.tokens, window);
        if (!matchedB.length) continue;
        const ws = startIdx + matchedB[0];
        const we = startIdx + matchedB.at(-1)!;
        // F1 of completeness (script words spoken) and precision (no extra words/slips)
        const recall = length / n;
        const precision = length / (we - ws + 1);
        const score = (2 * recall * precision) / (recall + precision);
        if (score < minScore) continue;
        found.push({
          clip: c.t.clip,
          start: c.words[ws].start,
          end: c.words[we].end,
          score: Math.round(score * 100) / 100,
          heard: c.words.slice(ws, we + 1).map((w) => w.text).join(' '),
          wordStart: ws,
          wordEnd: we,
        });
      }
    }
    // merge overlapping hits (best one stays)
    found.sort((a, b) => b.score - a.score);
    const unique: Candidate[] = [];
    for (const f of found) {
      if (!unique.some((u) => u.clip === f.clip && f.start < u.end && f.end > u.start)) unique.push(f);
    }
    // equally good takes: later ones first (usually the better attempt)
    unique.sort((a, b) => b.score - a.score || clipOrder(b, a));
    return { ...s, candidates: unique.slice(0, topN) };
  });

  writeJson(paths.candidatesJson, { script: { sections: script.sections, directions: script.directions }, sentences: results });
  fs.writeFileSync(paths.candidatesMd, toMarkdown(script.sections, script.directions, results));
  const missing = results.filter((r) => !r.candidates.length);
  const weak = results.filter((r) => r.candidates.length && r.candidates[0].score < 0.85);
  log.ok(`work/candidates.md written`);
  log.info(`${results.length - missing.length}/${results.length} sentences found, ${weak.length} uncertain (<0.85)`);
  if (missing.length) log.warn(`No take: ${missing.map((m) => m.id).join(', ')}`);
});

function clipOrder(a: Candidate, b: Candidate) {
  const c = a.clip.localeCompare(b.clip, 'en', { numeric: true });
  return c !== 0 ? c : a.start - b.start;
}

function toMarkdown(
  sections: Array<{ id: string; title: string }>,
  directions: Array<{ afterSentence: string | null; text: string }>,
  results: Array<{ id: string; section: string | null; text: string; candidates: Candidate[] }>,
): string {
  const out: string[] = [
    '# Takes per script sentence',
    '',
    'Score 0–1: all script words spoken AND no extra words (slips, "uh") = 1.00. On equal scores the later take is listed first.',
    'Times = source time in seconds (usable directly in edl.json). `heard` = what was actually said.',
    '',
  ];
  let section: string | null = '__none__';
  const dirAfter = new Map<string | null, string[]>();
  for (const d of directions) dirAfter.set(d.afterSentence, [...(dirAfter.get(d.afterSentence) ?? []), d.text]);
  for (const d of dirAfter.get(null) ?? []) out.push(`> [${d}]`, '');
  for (const r of results) {
    if (r.section !== section) {
      section = r.section;
      const title = sections.find((s) => s.id === section)?.title;
      if (title) out.push(`## ${section} ${title}`, '');
    }
    out.push(`**${r.id}** ${r.text}`);
    if (!r.candidates.length) out.push('- ⚠ no take found');
    for (const c of r.candidates) {
      out.push(`- \`${c.clip}\` ${c.start.toFixed(2)}–${c.end.toFixed(2)} · ${c.score.toFixed(2)} · heard: "${c.heard}"`);
    }
    for (const d of dirAfter.get(r.id) ?? []) out.push(`> [${d}]`);
    out.push('');
  }
  return out.join('\n');
}

