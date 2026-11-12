/**
 * GERMAN ONLY: number words → digits for captions. The transcription spells numbers out, and long German
 * compound number words are unreadable when they wrap across caption lines. Only applied when the project
 * language is German (see build-timeline.ts); the word lists below are German data on purpose.
 *  - 13 and up always as digits ("einundsechzig" → 61, "neunzehntausendneunhundertneunzig" → 19.990)
 *  - up to 12 only before a unit/range ("elf kW" → 11 kW, "zehn bis fünfzehn Minuten" → 10 bis 15 Minuten), otherwise as a word ("drei Dinge")
 *  - "X Komma Y" → "X,Y", "X Punkt Y" → "X.Y" (versions: "drei Punkt sieben" → 3.7)
 */
const UNITS: Record<string, number> = { ein: 1, eins: 1, eine: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9 };
const TEENS: Record<string, number> = { null: 0, zehn: 10, elf: 11, zwölf: 12, dreizehn: 13, vierzehn: 14, fünfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19 };
const TENS: Record<string, number> = { zwanzig: 20, dreißig: 30, vierzig: 40, fünfzig: 50, sechzig: 60, siebzig: 70, achtzig: 80, neunzig: 90 };
const UNIT_WORDS = /^(kw|kwh|prozent|volt|kilometer|kilowattstunden|euro|stunden|minuten|sekunden|jahre|monate|tage|meter|km|bis|komma|punkt|%|€)$/i;

function below100(s: string): number | undefined {
  if (s === '') return 0;
  if (s in TEENS) return TEENS[s];
  if (s in UNITS) return UNITS[s];
  if (s in TENS) return TENS[s];
  const m = s.match(/^(ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun)und(zwanzig|dreißig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig)$/);
  return m ? UNITS[m[1]] + TENS[m[2]] : undefined;
}
function below1000(s: string): number | undefined {
  const i = s.indexOf('hundert');
  if (i < 0) return below100(s);
  const head = s.slice(0, i);
  const h = head === '' ? 1 : UNITS[head];
  const rest = below100(s.slice(i + 7));
  return h === undefined || rest === undefined ? undefined : h * 100 + rest;
}
export function parseGermanNumber(word: string): number | undefined {
  const s = word.toLowerCase();
  if (!/^[a-zäöüß]+$/.test(s)) return undefined;
  const i = s.indexOf('tausend');
  if (i < 0) return below1000(s);
  const head = s.slice(0, i);
  const t = head === '' ? 1 : below1000(head);
  const rest = below1000(s.slice(i + 7));
  return t === undefined || rest === undefined ? undefined : t * 1000 + rest;
}
const fmt = (n: number) => (n >= 10000 ? n.toLocaleString('de-DE') : String(n));

type W = { text: string; start: number; end: number };
const split = (text: string) => {
  const m = text.match(/^(.*?)([.,:;!?]*)$/s)!;
  return { core: m[1], punct: m[2] };
};

export function digitize<T extends W>(words: T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < words.length; i++) {
    const { core, punct } = split(words[i].text);
    const n = parseGermanNumber(core);
    if (n === undefined) {
      out.push(words[i]);
      continue;
    }
    // merge "X Komma Y" / "X Punkt Y" (German for "X point Y")
    const sep = words[i + 1] && !punct ? split(words[i + 1].text) : undefined;
    const third = words[i + 2] ? split(words[i + 2].text) : undefined;
    const m = third ? parseGermanNumber(third.core) : undefined;
    if (sep && !sep.punct && /^(komma|punkt)$/i.test(sep.core) && m !== undefined && m < 10) {
      out.push({ ...words[i], text: `${n}${sep.core.toLowerCase() === 'komma' ? ',' : '.'}${m}${third!.punct}`, end: words[i + 2].end });
      i += 2;
      continue;
    }
    const nextCore = words[i + 1] ? split(words[i + 1].text).core : '';
    const prevCore = i > 0 ? split(words[i - 1].text).core : '';
    const ranged = /^bis$/i.test(prevCore) && n <= 12 && i >= 2 && /^\d/.test(out[out.length - 2]?.text ?? '');
    if (n >= 13 || (!punct && UNIT_WORDS.test(nextCore)) || ranged) out.push({ ...words[i], text: fmt(n) + punct });
    else out.push(words[i]);
  }
  return out;
}
