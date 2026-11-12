import { spawn, spawnSync } from 'node:child_process';

export type RunResult = { code: number; stdout: string; stderr: string };

export function run(cmd: string, args: string[], opts: { quiet?: boolean; cwd?: string } = {}): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: opts.cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (err) => reject(new Error(`${cmd} could not be started: ${err.message}`)));
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

export async function runOrThrow(cmd: string, args: string[], what: string): Promise<RunResult> {
  const res = await run(cmd, args);
  if (res.code !== 0) {
    const tail = res.stderr.split('\n').filter(Boolean).slice(-6).join('\n');
    throw new Error(`${what} failed (${cmd} exit ${res.code}):\n${tail}`);
  }
  return res;
}

export function hasBinary(name: string): boolean {
  const res = spawnSync('which', [name], { stdio: 'ignore' });
  return res.status === 0;
}

export type Probe = {
  duration: number;
  fps: number;
  width: number;
  height: number;
  hasVideo: boolean;
  hasAudio: boolean;
  codec?: string;
};

export async function probe(file: string): Promise<Probe> {
  const res = await runOrThrow(
    'ffprobe',
    ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file],
    `ffprobe ${file}`,
  );
  const data = JSON.parse(res.stdout) as {
    format?: { duration?: string };
    streams?: Array<{
      codec_type?: string;
      codec_name?: string;
      width?: number;
      height?: number;
      avg_frame_rate?: string;
      r_frame_rate?: string;
      duration?: string;
      side_data_list?: Array<{ rotation?: number }>;
      tags?: { rotate?: string };
    }>;
  };
  const streams = data.streams ?? [];
  const v = streams.find((s) => s.codec_type === 'video' && s.codec_name !== 'mjpeg' && s.codec_name !== 'png');
  const a = streams.find((s) => s.codec_type === 'audio');
  const rate = (r?: string) => {
    if (!r) return 0;
    const [n, d] = r.split('/').map(Number);
    return d ? n / d : n;
  };
  let width = v?.width ?? 0;
  let height = v?.height ?? 0;
  const rotation = Math.abs(Number(v?.side_data_list?.find((s) => s.rotation !== undefined)?.rotation ?? v?.tags?.rotate ?? 0));
  if (rotation === 90 || rotation === 270) [width, height] = [height, width];
  return {
    duration: Number(data.format?.duration ?? v?.duration ?? a?.duration ?? 0),
    fps: rate(v?.avg_frame_rate) || rate(v?.r_frame_rate),
    width,
    height,
    hasVideo: Boolean(v),
    hasAudio: Boolean(a),
    codec: v?.codec_name,
  };
}

/** Pixel size of a still image (JPG, PNG, WebP …). probe() skips mjpeg/png streams because they are cover art in audio and video files. */
export async function imageSize(file: string): Promise<{ width: number; height: number } | null> {
  const res = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', file], { quiet: true });
  if (res.code !== 0) return null;
  try {
    const s = (JSON.parse(res.stdout) as { streams?: Array<{ width?: number; height?: number }> }).streams?.[0];
    return s?.width && s?.height ? { width: s.width, height: s.height } : null;
  } catch {
    return null;
  }
}
