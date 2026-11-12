const tty = process.stdout.isTTY;
const paint = (code: number) => (s: string) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const green = paint(32);
const yellow = paint(33);
const red = paint(31);
const dim = paint(2);
const bold = paint(1);

export const log = {
  step: (msg: string) => console.log(`\n${bold('▸ ' + msg)}`),
  info: (msg: string) => console.log(`  ${msg}`),
  ok: (msg: string) => console.log(`  ${green('✓')} ${msg}`),
  warn: (msg: string) => console.warn(`  ${yellow('!')} ${msg}`),
  error: (msg: string) => console.error(`  ${red('✗')} ${msg}`),
  dim: (msg: string) => console.log(`  ${dim(msg)}`),
};

export function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Prints errors cleanly and exits the process (used by all CLI scripts). */
export async function main(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    log.error(err instanceof Error ? err.message : String(err));
    if (process.env.DEBUG && err instanceof Error) console.error(err.stack);
    process.exit(1);
  }
}
