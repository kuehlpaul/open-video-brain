import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { ROOT } from './paths';

const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, quiet: true });
}

export function env(name: string, fallback?: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== '' ? v.trim() : fallback;
}

export function requireEnv(name: string, hint?: string): string {
  const v = env(name);
  if (!v) {
    throw new Error(
      `${name} missing in .env.${hint ? ' ' + hint : ''} File: ${envFile} (template: .env.example)`,
    );
  }
  return v;
}

export function envNumber(name: string, fallback: number): number {
  const v = env(name);
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function maskSecret(v: string | undefined): string {
  if (!v) return '(empty)';
  return v.length <= 8 ? '****' : `${v.slice(0, 4)}…${v.slice(-2)}`;
}
