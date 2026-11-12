/** Text helpers: normalization, script parsing, LCS matching. */

export function normalizeToken(t: string): string {
  return t
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

export function tokenize(text: string): string[] {
  return text
    .normalize('NFKC')
    .split(/[\s \-–—/]+/)
    .map(normalizeToken)
    .filter(Boolean);
}

export type ScriptSentence = { id: string; section: string | null; text: string; tokens: string[] };
export type ScriptSection = { id: string; title: string };
export type ScriptDirection = { afterSentence: string | null; text: string };
export type ParsedScript = { sections: ScriptSection[]; sentences: ScriptSentence[]; directions: ScriptDirection[] };

/**
 * Script conventions (see projects/_template/input/script.md):
 *   # Heading              → chapter
 *   [DIRECTION ...]        → direction (not spoken): graphic, card, B-roll, VOICE …
 *   > note                 → note (ignored)
 *   <!-- comment -->       → ignored
 *   everything else        → spoken text
 */
export function parseScript(md: string): ParsedScript {
  const sections: ScriptSection[] = [];
  const sentences: ScriptSentence[] = [];
  const directions: ScriptDirection[] = [];
  let section: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    const para = buffer.join(' ').replace(/\s+/g, ' ').trim();
    buffer = [];
    if (!para) return;
    for (const s of splitSentences(para)) {
      const tokens = tokenize(s);
      if (!tokens.length) continue;
      sentences.push({ id: `S${sentences.length + 1}`, section, text: s, tokens });
    }
  };

  const lines = md.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith('#')) {
      flush();
      // optional "Chapter:" prefix (German scripts: "Kapitel:")
      const title = line.replace(/^#+\s*/, '').replace(/^(?:Chapter|Kapitel):\s*/i, '');
      section = `H${sections.length + 1}`;
      sections.push({ id: section, title });
      continue;
    }
    if (line.startsWith('>')) continue;
    if (/^\[.*\]$/.test(line)) {
      flush();
      directions.push({ afterSentence: sentences.at(-1)?.id ?? null, text: line.slice(1, -1).trim() });
      continue;
    }
    buffer.push(line.replace(/^[-*]\s+/, ''));
  }
  flush();
  return { sections, sentences, directions };
}

export function splitSentences(paragraph: string): string[] {
  return paragraph
    .split(/(?<=[.!?…])\s+(?=[„"«»(\p{Lu}\p{N}])/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Longest common subsequence; returns the length + matched indices in b. */
export function lcs(a: string[], b: string[]): { length: number; matchedB: number[] } {
  const n = a.length;
  const m = b.length;
  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const matchedB: number[] = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      matchedB.unshift(j - 1);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return { length: dp[n][m], matchedB };
}
