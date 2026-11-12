/**
 * Records a website as B-roll: a smooth scroll video or a still. Free, runs locally with Remotion's Chrome.
 *   npm run capture -- <slug> --url https://example.com/pricing --name pricing                 scroll video, 8 s
 *   npm run capture -- <slug> --url … --name pricing-still --mode still [--full-page]           screenshot (PNG)
 *   [--seconds 8] [--distance 1600] [--wait 2] [--click "<selector>"] [--hide "<css selector>"] [--lang de-DE]
 *
 * Viewport follows the project: 1920×1080 (longform) or 1080×1920 (Short).
 *   scroll → work/assets/<name>.mp4 (H.264, 25 fps)  – in the EDL as `Video` with `frame: "monitor"`
 *   still  → work/assets/<name>.png (2× pixel density) – in the EDL as `Photo`
 * Cookie banners: --click "<accept button selector>" or --hide "<banner selector>".
 * Sidecar <name>.json holds the URL, the capture time and the source line ("Screenshot: <domain>").
 */
import fs from 'node:fs';
import path from 'node:path';
import { ensureBrowser } from '@remotion/renderer';
import puppeteer, { type Page } from 'puppeteer-core';
import { loadProject, parseCli } from './lib/cli';
import { env } from './lib/env';
import { run, probe } from './lib/exec';
import { log, main } from './lib/log';
import { ensureDir, rootRel, writeJson } from './lib/paths';

const REGION: Record<string, string> = { en: 'en-US', de: 'de-DE', fr: 'fr-FR', es: 'es-ES', it: 'it-IT', pt: 'pt-PT', nl: 'nl-NL', pl: 'pl-PL', sv: 'sv-SE', da: 'da-DK', nb: 'nb-NO', fi: 'fi-FI', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN' };

const USAGE =
  'npm run capture -- <slug> --url <url> --name <name> [--mode scroll|still] [--seconds 8] [--distance <px>] [--full-page] [--wait 2] [--click "<selector>"] [--hide "<selector>"] [--lang de-DE]';
const FPS = 25;

main(async () => {
  const { values, positionals } = parseCli(USAGE, {
    url: { type: 'string' },
    name: { type: 'string' },
    mode: { type: 'string', default: 'scroll' },
    seconds: { type: 'string', default: '8' },
    distance: { type: 'string' },
    'full-page': { type: 'boolean', default: false },
    wait: { type: 'string', default: '2' },
    click: { type: 'string', multiple: true },
    hide: { type: 'string', multiple: true },
    lang: { type: 'string' },
  });
  const { paths, config } = loadProject(positionals[0], USAGE);
  if (!values.url || !/^https?:\/\//.test(values.url)) throw new Error(`--url missing or not http(s).\n  ${USAGE}`);
  if (!values.name || !/^[a-z0-9-]+$/.test(values.name)) throw new Error('--name missing or contains characters other than a-z, 0-9, -');
  if (values.mode !== 'scroll' && values.mode !== 'still') throw new Error('--mode: scroll or still');
  const seconds = Number(values.seconds);
  if (!(seconds >= 3 && seconds <= 60)) throw new Error('--seconds: 3–60');

  const portrait = config.format === 'short';
  const viewport = portrait ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
  // browser locale: a full tag as given, a known region for common languages, otherwise the bare language ("en-EN" is not a locale)
  const lang = values.lang ?? (config.language.includes('-') ? config.language : (REGION[config.language] ?? config.language));
  const domain = new URL(values.url).hostname.replace(/^www\./, '');

  const status = await ensureBrowser({ browserExecutable: env('REMOTION_BROWSER_EXECUTABLE') ?? null });
  if (!('path' in status)) throw new Error(`No browser available (${status.type}) – run npm run render once or check Remotion's browser download.`);
  const browser = await puppeteer.launch({
    executablePath: status.path,
    headless: true,
    args: [`--lang=${lang}`, '--hide-scrollbars', '--force-color-profile=srgb', '--disable-blink-features=AutomationControlled'],
  });
  try {
    const page = await browser.newPage();
    // headless user agents get blocked or served stripped-down pages
    await page.setUserAgent({ userAgent: (await browser.userAgent()).replace('HeadlessChrome', 'Chrome') });
    await page.setExtraHTTPHeaders({ 'Accept-Language': `${lang},${lang.split('-')[0]};q=0.9,en;q=0.8` });
    await page.setViewport({ ...viewport, deviceScaleFactor: values.mode === 'still' ? 2 : 1 });

    log.step(`${values.url} (${viewport.width}×${viewport.height}, ${values.mode})`);
    await page.goto(values.url, { waitUntil: 'networkidle2', timeout: 60_000 });
    for (const sel of values.click ?? []) {
      const el = await page.waitForSelector(sel, { timeout: 8000 }).catch(() => null);
      if (el) {
        await el.click();
        log.dim(`clicked ${sel}`);
      } else log.warn(`--click: "${sel}" not found – continuing`);
    }
    if (values.hide?.length) await page.addStyleTag({ content: `${values.hide.join(', ')} { display: none !important; }` });
    await new Promise((r) => setTimeout(r, Number(values.wait) * 1000));
    await settle(page);
    const overlays = await findOverlays(page);
    if (overlays.length) log.warn(`Overlay(s) covering the page (banner, cookie notice?): ${overlays.map((o) => `--hide "${o}"`).join(' ')}`);

    const assets = ensureDir(paths.assets);
    let out: string;
    if (values.mode === 'still') {
      out = path.join(assets, `${values.name}.png`);
      await page.screenshot({ path: out as `${string}.png`, fullPage: values['full-page'] });
    } else {
      out = path.join(assets, `${values.name}.mp4`);
      const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
      // default: ~0.25 viewport heights per second – calm enough to read, scroll time = seconds minus 1 s hold at each end
      const distance = Math.max(0, Math.min(maxScroll, values.distance ? Number(values.distance) : Math.round(viewport.height * 0.25 * (seconds - 2))));
      if (distance < viewport.height * 0.2) log.warn(`Page only scrolls ${distance} px – the clip will look almost static (try --mode still)`);
      // Deterministic: one scroll position + screenshot per frame (exact 25 fps, no stutter on a slow machine).
      // 1 s hold at both ends, ease-in-out in between.
      const frames = Math.round(seconds * FPS);
      const hold = FPS;
      const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
      const tmp = ensureDir(path.join(assets, `.${values.name}-frames`));
      for (let i = 0; i < frames; i++) {
        const p = Math.min(1, Math.max(0, (i - hold) / (frames - 2 * hold - 1)));
        // sub-pixel scroll positions are rounded by the browser – keep it integer
        await page.evaluate((y: number) => window.scrollTo(0, y), Math.round(distance * ease(p)));
        await page.screenshot({ path: path.join(tmp, `${String(i).padStart(5, '0')}.jpg`) as `${string}.jpg`, type: 'jpeg', quality: 95, optimizeForSpeed: true });
        if (i % FPS === 0) process.stdout.write(`\r  frame ${i}/${frames}`);
      }
      process.stdout.write('\n');
      fs.rmSync(out, { force: true }); // an older capture must not pass as the result if ffmpeg fails
      const enc = await run('ffmpeg', ['-y', '-v', 'error', '-framerate', String(FPS), '-i', path.join(tmp, '%05d.jpg'), '-vf', `scale=${viewport.width}:${viewport.height}:flags=lanczos`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out], { quiet: true });
      fs.rmSync(tmp, { recursive: true, force: true });
      if (enc.code !== 0 || !fs.existsSync(out)) throw new Error(`ffmpeg could not convert the recording:\n${enc.stderr.slice(0, 400)}`);
      const p = await probe(out);
      log.dim(`${p.width}×${p.height}, ${p.duration.toFixed(1)} s, scrolled ${distance} px`);
    }

    writeJson(path.join(assets, `${values.name}.json`), {
      kind: values.mode === 'still' ? 'image' : 'video',
      provider: 'capture',
      url: values.url,
      mode: values.mode,
      viewport,
      seconds: values.mode === 'scroll' ? seconds : undefined,
      source: `Screenshot: ${domain}`,
      capturedAt: new Date().toISOString(),
    });
    const rel = path.relative(paths.dir, out).split(path.sep).join('/');
    log.ok(`${rootRel(out)}`);
    log.info(
      values.mode === 'still'
        ? `edl.json: Photo { "src": "${rel}", "source": "Screenshot: ${domain}" }`
        : `edl.json: Video { "src": "${rel}", "frame": "monitor", "source": "Screenshot: ${domain}" }`,
    );
  } finally {
    await browser.close();
  }
});

/** Fixed/sticky elements that cover ≥ 15 % of the viewport (banners, cookie notices) – as CSS selectors for --hide. */
async function findOverlays(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const vw = window.innerWidth * window.innerHeight;
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const cs = getComputedStyle(el);
      if (!['fixed', 'sticky'].includes(cs.position) || cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if ((r.width * r.height) / vw < 0.15) continue;
      if (out.some((sel) => el.closest(sel))) continue;
      const cls = Array.from(el.classList).find((c) => /^[a-z][\w-]*$/i.test(c));
      out.push(el.id ? `#${CSS.escape(el.id)}` : cls ? `${el.tagName.toLowerCase()}.${cls}` : el.tagName.toLowerCase());
    }
    return out.slice(0, 4);
  });
}

/** Scroll once through the page so lazy-loaded images are there, then back to the top. */
async function settle(page: Page) {
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < Math.min(h, 12000); y += window.innerHeight * 0.8) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 10_000 }).catch(() => undefined);
}
