// Caption page builder (node-safe, no React): lines ≤ maxLine, long words hyphenated, pages via createTikTokStyleCaptions,
// start/end rounded to frames separately and capped at the next page (no 1-frame overlap).
//
// Language note: the unit words in UNIT_RE cover English and German; the vowel class used for hyphenation ([aeiouäöüy])
// and the abbreviation check ([A-ZÄÖÜ]) are tuned for those two as well. Extend them for other languages.
import { createTikTokStyleCaptions, type Caption } from '@remotion/captions';

export type Style = 'short' | 'longform';
export type Cfg = { maxLine: number; maxWord: number; pauseMs: number; holdMs: number; slack: number };
export const CFG: Record<Style, Cfg> = {
  // brand.json captions.short.maxLine = 13; single words up to 20 characters stay unbroken (avoids ugly splits of long compound words),
  // slack = how much longer a line may get so that no short word flashes up alone ("the", "a", "on.")
  short: { maxLine: 13, maxWord: 20, pauseMs: 500, holdMs: 400, slack: 9 },
  longform: { maxLine: 42, maxWord: 42, pauseMs: 700, holdMs: 700, slack: 0 },
};
export type PageToken = { text: string; startF: number };

/** Unit words that stay on the same line as the preceding number ("93 percent", "11 kW", "61 Prozent"). English, German and symbols. */
const UNIT_RE = new RegExp(
  `^(${[
    // symbols and abbreviations
    '%|€|\\$|£|kW|kWh|km|kg|mph',
    // English
    'percent|dollars?|euros?|pounds?|cents?|volts?|watts?|kilowatts?|kilowatt-hours?|kilometers?|kilometres?|miles?|meters?|metres?',
    'hours?|minutes?|seconds?|days?|weeks?|months?|years?|times|million|billion|thousand',
    // German
    'Prozent|Volt|Kilometer|Kilowattstunden|Stunden|Minuten|Sekunden|Jahre|Monate|Tage|Einwohnern|Händler|Länder|Ländern',
  ].join('|')})[.,:;!?…]*$`,
  'i',
);
export type Page = { from: number; dur: number; text: string; tokens: PageToken[] };

export const buildPages = (tokens: Caption[], cfg: Cfg, fps: number): Page[] => {
  // 1) drop empty tokens, split overlong words into parts ≤ maxWord (incl. hyphen), time split proportionally
  const words: Caption[] = [];
  for (const tk of tokens) {
    const w = tk.text.trim();
    if (!w) continue;
    if (w.length <= cfg.maxWord) {
      words.push({ text: ` ${w}`, startMs: tk.startMs, endMs: tk.endMs, timestampMs: null, confidence: null });
      continue;
    }
    // overlong: split at an existing hyphen, otherwise near the middle of the word after a vowel (never between two consonants mid-syllable)
    const dash = w.indexOf('-', 4);
    let cut = dash > 0 && dash < w.length - 3 ? dash + 1 : -1;
    if (cut < 0) {
      const mid = Math.floor(w.length / 2);
      for (let d = 0; d < mid - 3 && cut < 0; d++)
        for (const c of [mid + d, mid - d]) if (cut < 0 && /[aeiouäöüy]/i.test(w[c - 1]) && !/[aeiouäöüy]/i.test(w[c])) cut = c;
      if (cut < 0) cut = mid;
    }
    const dur = tk.endMs - tk.startMs;
    const at = tk.startMs + (dur * cut) / w.length;
    const first = w.slice(0, cut);
    words.push({ text: ` ${first}${first.endsWith('-') ? '' : '-'}`, startMs: tk.startMs, endMs: at, timestampMs: null, confidence: null, pageBreakAfter: true });
    words.push({ text: ` ${w.slice(cut)}`, startMs: at, endMs: tk.endMs, timestampMs: null, confidence: null });
  }
  // 2) lines = pages: break when the line would get too long, after the end of a sentence or after a speaking pause
  let len = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i].text.trim();
    const prev = i > 0 ? words[i - 1] : undefined;
    if (prev && !prev.pageBreakAfter) {
      // no short word alone: the line may grow by slack if a short word would otherwise stand alone
      const core = w.replace(/[.,:;!?…]+$/, '');
      const lonelyBefore = len <= 4 && i >= 1 && (i < 2 || words[i - 2].pageBreakAfter);
      const lonelyAfter = core.length <= 4 && (i === words.length - 1 || /[.!?…]$/.test(w) || words[i + 1].startMs - words[i].endMs >= cfg.pauseMs);
      // number + unit stay together: if the pair no longer fits, break before the number
      const isNum = /^\d[\d.,]*$/.test(core);
      const afterNum = /^\d[\d.,]*$/.test(prev.text.trim()) && UNIT_RE.test(w);
      const next = words[i + 1]?.text.trim() ?? '';
      const unit = UNIT_RE.test(next);
      const pair = isNum && unit && words[i + 1].startMs - words[i].endMs < cfg.pauseMs && !/[.!?…,]$/.test(w) ? 1 + next.length : 0;
      const limit = lonelyBefore || lonelyAfter || afterNum ? cfg.maxLine + cfg.slack : cfg.maxLine;
      const tooLong = len + 1 + w.length + pair > limit;
      const sentence = /[.!?…]$/.test(prev.text) && !/^[A-ZÄÖÜ]{1,3}\.$/.test(prev.text.trim());
      const pause = words[i].startMs - prev.endMs >= cfg.pauseMs;
      if (tooLong || sentence || pause) prev.pageBreakAfter = true;
    }
    len = !prev || prev.pageBreakAfter ? w.length : len + 1 + w.length;
  }
  if (!words.length) return [];
  // pages only at pageBreakAfter (time window practically infinite)
  const { pages } = createTikTokStyleCaptions({ captions: words, combineTokensWithinMilliseconds: Number.MAX_SAFE_INTEGER });
  // 3) frames: round start and end separately, end ≤ start of the next page
  const toF = (ms: number) => Math.round((ms / 1000) * fps);
  const starts = pages.map((pg) => toF(pg.startMs));
  const out: Page[] = [];
  pages.forEach((pg, i) => {
    if (!pg.tokens.length) return;
    const lastTok = pg.tokens[pg.tokens.length - 1];
    // until the next page, at most holdMs after the last word (the last page also holds for holdMs)
    const nextStart = i < pages.length - 1 ? pages[i + 1].startMs : Number.POSITIVE_INFINITY;
    const endMs = Math.min(nextStart, lastTok.toMs + cfg.holdMs);
    const from = starts[i];
    let to = Math.max(toF(endMs), from + 1);
    if (i < pages.length - 1) to = Math.min(to, starts[i + 1]);
    if (to <= from) return;
    out.push({ from, dur: to - from, text: pg.text, tokens: pg.tokens.map((tk) => ({ text: tk.text, startF: toF(tk.fromMs) })) });
  });
  return out;
};
