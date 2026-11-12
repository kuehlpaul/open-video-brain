/**
 * Checks whether this machine + drive are ready to go.
 *   npm run doctor
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { env, maskSecret } from './lib/env';
import { hasBinary, run } from './lib/exec';
import { log, main } from './lib/log';
import { BRAND, ROOT, readJson } from './lib/paths';

main(async () => {
  let problems = 0;
  const bad = (m: string) => {
    problems++;
    log.error(m);
  };

  const install = (pkg: string) => (process.platform === 'darwin' ? `brew install ${pkg}` : `install ${pkg} with your package manager`);

  log.step('System');
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major > 20 || (major === 20 && minor >= 6)) log.ok(`Node ${process.versions.node}`);
  else bad(`Node ${process.versions.node} – at least 20.6 required (${install('node')})`);
  for (const b of ['ffmpeg', 'ffprobe']) (hasBinary(b) ? log.ok : bad)(`${b}${hasBinary(b) ? '' : ` missing – ${install('ffmpeg')}`}`);
  (hasBinary('claude') ? log.ok : log.warn)(hasBinary('claude') ? 'Claude Code installed' : 'Claude Code not in PATH');

  log.step('Drive');
  if (process.platform === 'darwin') {
    const mount = ROOT.startsWith('/Volumes/') ? ROOT.split('/').slice(0, 3).join('/') : null;
    if (mount) {
      const info = await run('diskutil', ['info', mount]);
      const fsType = /File System Personality:\s*(.+)/.exec(info.stdout)?.[1]?.trim() ?? 'unknown';
      if (/APFS/i.test(fsType)) log.ok(`${mount}: ${fsType}`);
      else log.warn(`${mount}: ${fsType} – works, but APFS (encrypted) is recommended: exFAT has no symlinks, creates ._ files and is more fragile when unplugged uncleanly.`);
      const enc = /FileVault:\s*Yes|Encrypted:\s*Yes/i.test(info.stdout);
      (enc ? log.ok : log.warn)(enc ? 'Volume encrypted' : 'Volume not encrypted – .env with API keys is stored in plain text')
    } else log.dim('Repo is not under /Volumes – drive check skipped');
  }
  const free = fs.statfsSync(ROOT);
  const gb = (free.bavail * free.bsize) / 1e9;
  (gb > 50 ? log.ok : log.warn)(`${gb.toFixed(0)} GB free`);

  log.step('Dependencies');
  const nm = path.join(ROOT, 'node_modules');
  if (!fs.existsSync(nm)) bad('node_modules missing – bash setup.sh');
  else {
    const arch = `${process.platform}-${os.arch()}`;
    const marker = path.join(nm, '.installed-for');
    const installedFor = fs.existsSync(marker) ? fs.readFileSync(marker, 'utf8').trim() : null;
    if (installedFor === arch) log.ok(`node_modules for ${arch}`);
    // plain `npm install`/`npm ci` leaves no marker – that is fine on the machine that ran it
    else if (installedFor === null) log.warn(`node_modules installed without setup.sh – fine on this machine; run bash setup.sh if the folder moves to another computer`);
    else bad(`node_modules was installed for ${installedFor}, this machine is ${arch} – bash setup.sh`);
  }

  log.step('.env');
  if (!fs.existsSync(path.join(ROOT, '.env'))) log.warn('.env missing – cp .env.example .env and add your keys (the demo runs without)');
  const keys: Array<[string, boolean, string]> = [
    ['ELEVENLABS_API_KEY', true, 'transcription, voice clone, isolation – needed for your own footage, the demo runs without'],
    ['FAL_KEY', false, 'image/video/audio generation (fal.ai)'],
    ['BFL_API_KEY', false, 'image generation (Black Forest Labs FLUX)'],
    ['HIGGSFIELD_API_KEY', false, 'image/video generation (Higgsfield)'],
    ['ATLAS_API_KEY', false, 'image/video generation (Atlas Cloud)'],
    ['PEXELS_API_KEY', false, 'stock photo/video search'],
    ['PIXABAY_API_KEY', false, 'stock photo/video search'],
    ['UNSPLASH_ACCESS_KEY', false, 'stock photo search'],
    ['COVERR_API_KEY', false, 'stock video + music search (Coverr)'],
    ['FREESOUND_API_KEY', false, 'sound effect search'],
    ['MAGNIFIC_API_KEY', false, 'upscaling small photos (Magnific Precision)'],
    ['REMOTION_LICENSE_KEY', false, 'Remotion Company License (required for companies with 4+ people)'],
  ];
  for (const [k, required, what] of keys) {
    const v = env(k);
    if (v) log.ok(`${k} ${maskSecret(v)} – ${what}`);
    else if (required) log.warn(`${k} missing – ${what}`);
    else log.warn(`${k} empty – ${what}`);
  }
  const hk = env('HIGGSFIELD_API_KEY');
  if (hk && !hk.includes(':')) bad('HIGGSFIELD_API_KEY must be <key id>:<key secret>');

  log.step('Brand');
  const brandJson = readJson<{ name: string; channel?: { name: string }; logo?: { enabled: boolean } }>(path.join(BRAND, 'brand.json'));
  if (brandJson.name === 'Example Brand') log.warn('Still the example brand – run /welcome in Claude Code (or npm run brand)');
  else log.ok(`Brand "${brandJson.channel?.name ?? brandJson.name}"${brandJson.logo?.enabled === false ? ' (no logo)' : ''}`);
  const family = readJson<{ typography: { family: string } }>(path.join(BRAND, 'brand.json')).typography.family;
  const fontDir = path.join(BRAND, 'fonts');
  const fonts = fs.existsSync(fontDir) ? fs.readdirSync(fontDir).filter((f) => /\.(woff2?|ttf|otf)$/i.test(f) && !f.startsWith('.')) : [];
  if (fonts.length) log.ok(`Font "${family}": ${fonts.length} file(s) in brand/fonts`);
  else {
    const fc = hasBinary('fc-list') ? await run('fc-list', [':', 'family']) : null;
    const installed = fc?.code === 0 && fc.stdout.split('\n').some((l) => l.split(',').some((n) => n.trim().toLowerCase() === family.toLowerCase()));
    if (installed) log.ok(`Font "${family}": installed on this machine (brand/fonts is empty)`);
    else log.warn(`Font "${family}": brand/fonts is empty – unless "${family}" is installed here, text renders in a system font and may not fit the boxes. Add font files (brand/fonts/README.md)`);
  }
  const voices = z
    .object({ voices: z.record(z.string(), z.object({ voiceId: z.string(), consent: z.boolean() })) })
    .parse(readJson(path.join(BRAND, 'voices.json'))).voices;
  for (const [name, v] of Object.entries(voices)) {
    if (v.voiceId && v.consent) log.ok(`Voice ${name}: ready`);
    else log.warn(`Voice ${name}: ${!v.voiceId ? 'no voiceId' : 'no consent'} – voice inserts not possible`);
  }

  console.log('');
  if (problems) {
    log.error(`${problems} problem(s). Fix them before editing.`);
    process.exit(1);
  }
  log.ok('All set.');
});
