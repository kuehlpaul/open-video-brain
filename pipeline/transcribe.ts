/**
 * Transcription with ElevenLabs Scribe (word timestamps). Results are cached:
 * clips that are already transcribed cost nothing (unless --force).
 *   npm run transcribe -- <slug> [--force] [--diarize]
 *
 * Writes per clip:
 *   work/transcripts/<clip>.json  – all words with start/end (for scripts)
 *   work/transcripts/<clip>.txt   – readable phrases with times (for Claude)
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadProject, parseCli } from './lib/cli';
import { speechToText } from './lib/elevenlabs';
import { env } from './lib/env';
import { formatTime, log, main } from './lib/log';
import { baseName, ensureDir, readJson, writeJson } from './lib/paths';
import { FootageIndex, type Transcript, type Word } from './schemas/transcript';

const USAGE = 'npm run transcribe -- <slug> [--force] [--diarize] [--speakers N]';

main(async () => {
  const { values, positionals } = parseCli(USAGE, {
    force: { type: 'boolean', default: false },
    diarize: { type: 'boolean', default: false },
    speakers: { type: 'string' },
  });
  const { paths, config } = loadProject(positionals[0], USAGE);
  if (config.sourceProject) {
    log.info(`Transcripts come from ${config.sourceProject}.`);
    return;
  }
  if (!fs.existsSync(paths.footageIndex)) throw new Error('work/footage.json missing – first run: npm run ingest -- ' + config.slug);
  const footage = FootageIndex.parse(readJson(paths.footageIndex)).filter((f) => f.hasAudio);
  ensureDir(paths.transcripts);

  const todo = footage.filter((f) => values.force || !fs.existsSync(path.join(paths.transcripts, `${baseName(f.clip)}.json`)));
  const minutes = todo.reduce((s, f) => s + f.duration, 0) / 60;
  log.step(`Transcribing ${todo.length}/${footage.length} clips (${minutes.toFixed(1)} min, rest from cache)`);

  for (const f of todo) {
    const proxy = path.join(paths.audioProxy, `${baseName(f.clip)}.wav`);
    if (!fs.existsSync(proxy)) throw new Error(`Audio proxy missing for ${f.clip} – npm run ingest -- ${config.slug}`);
    const res = await speechToText(proxy, {
      language: config.language,
      keyterms: config.keyterms,
      diarize: values.diarize,
      numSpeakers: values.speakers ? Number(values.speakers) : undefined,
    });
    const words: Word[] = res.words
      .filter((w) => w.type === 'word' || w.type === 'audio_event')
      .map((w) => ({
        text: w.text.trim(),
        start: round(w.start),
        end: round(w.end),
        type: w.type === 'audio_event' ? 'audio_event' : 'word',
        speaker: w.speaker_id,
        logprob: w.logprob,
      }));
    const transcript: Transcript = {
      clip: f.clip,
      language: res.language_code,
      model: env('ELEVENLABS_STT_MODEL', 'scribe_v2')!,
      createdAt: new Date().toISOString(),
      words,
    };
    const base = path.join(paths.transcripts, baseName(f.clip));
    writeJson(`${base}.json`, transcript);
    fs.writeFileSync(`${base}.txt`, toReadable(transcript));
    log.ok(`${f.clip}: ${words.length} words`);
  }

  // overview for Claude: all clips in one file
  const all = footage
    .map((f) => path.join(paths.transcripts, `${baseName(f.clip)}.txt`))
    .filter((p) => fs.existsSync(p))
    .map((p) => fs.readFileSync(p, 'utf8'))
    .join('\n');
  fs.writeFileSync(path.join(paths.transcripts, '_all.txt'), all);
  log.ok('work/transcripts/_all.txt updated');
});

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

/** Splits phrases at pauses > 0.6 s or sentence ends. Format: [12.34–15.80] text */
export function toReadable(t: Transcript): string {
  const lines: string[] = [`## ${t.clip}`];
  let cur: Word[] = [];
  const flush = () => {
    if (!cur.length) return;
    const text = cur.map((w) => (w.type === 'audio_event' ? `(${w.text.replace(/[()]/g, '')})` : w.text)).join(' ');
    lines.push(`[${cur[0].start.toFixed(2)}–${cur.at(-1)!.end.toFixed(2)}] ${text}`);
    cur = [];
  };
  t.words.forEach((w, i) => {
    const prev = t.words[i - 1];
    if (prev && w.start - prev.end > 0.6) flush();
    cur.push(w);
    if (/[.!?]$/.test(w.text)) flush();
  });
  flush();
  const dur = t.words.at(-1)?.end ?? 0;
  lines.push(`(end ${formatTime(dur)})`, '');
  return lines.join('\n');
}
