/**
 * fal.ai queue API for image and video generation (one key, many models).
 * Docs: https://fal.ai/docs/documentation/model-apis/inference/queue
 */
import { requireEnv } from './env';
import { log } from './log';

type QueueSubmit = { request_id: string; status_url: string; response_url: string };
type QueueStatus = { status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED'; queue_position?: number; error?: string };

export async function falRun(model: string, input: Record<string, unknown>, timeoutMs = 15 * 60_000): Promise<unknown> {
  const key = requireEnv('FAL_KEY', 'Get a key at fal.ai → Dashboard → Keys.');
  const headers = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' };
  const submit = await fetch(`https://queue.fal.run/${model}`, { method: 'POST', headers, body: JSON.stringify(input) });
  if (!submit.ok) throw new Error(`fal ${model} → HTTP ${submit.status}: ${(await submit.text()).slice(0, 400)}`);
  const job = (await submit.json()) as QueueSubmit;
  const started = Date.now();
  let last = '';
  for (;;) {
    if (Date.now() - started > timeoutMs) throw new Error(`fal ${model}: timed out after ${timeoutMs / 1000}s`);
    await new Promise((r) => setTimeout(r, 3000));
    const st = await fetch(job.status_url, { headers });
    if (!st.ok) {
      if (st.status >= 500 || st.status === 429) continue;
      throw new Error(`fal status → HTTP ${st.status}: ${(await st.text()).slice(0, 400)}`);
    }
    const status = (await st.json()) as QueueStatus;
    if (status.status !== last) {
      log.dim(`fal: ${status.status}${status.queue_position !== undefined ? ` (position ${status.queue_position})` : ''}`);
      last = status.status;
    }
    if (status.status === 'COMPLETED') {
      if (status.error) throw new Error(`fal ${model}: ${status.error}`);
      const res = await fetch(job.response_url, { headers });
      if (!res.ok) throw new Error(`fal result → HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);
      return res.json();
    }
  }
}

/** Finds the first media URL in the (model-dependent) result. */
export function findMediaUrl(result: unknown): string | null {
  const r = result as Record<string, unknown>;
  const candidates: unknown[] = [
    (r.images as Array<{ url?: string }> | undefined)?.[0]?.url,
    (r.image as { url?: string } | undefined)?.url,
    (r.video as { url?: string } | undefined)?.url,
    (r.videos as Array<{ url?: string }> | undefined)?.[0]?.url,
    (r.audio as { url?: string } | undefined)?.url,
    r.url,
  ];
  return (candidates.find((c) => typeof c === 'string') as string | undefined) ?? null;
}
