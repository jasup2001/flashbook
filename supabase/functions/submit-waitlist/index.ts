import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { validateWaitlist } from '../_shared/validation.ts';

const origins = new Set(['http://127.0.0.1:5174', 'http://localhost:5174', 'http://127.0.0.1:4173', 'http://localhost:4173', 'https://jasup2001.site', 'https://www.jasup2001.site']);
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const server = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') ?? '';
  const cors = { 'Access-Control-Allow-Origin': origins.has(origin) ? origin : 'null', 'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  const reply = (status: number, body: object) => Response.json(body, { status, headers: { ...cors, 'Cache-Control': 'no-store' } });
  if (!origins.has(origin)) return reply(403, { error: 'this origin is not allowed.' });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'method not allowed.' });
  // Modern publishable keys are not JWTs: authenticate them in this handler instead.
  let keys: Record<string, string> = {};
  try { keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}'); } catch { return reply(503, { error: 'the form is temporarily unavailable.' }); }
  const allowedKeys = [...Object.values(keys), Deno.env.get('SUPABASE_PUBLISHABLE_KEY')].filter(Boolean);
  if (!allowedKeys.includes(req.headers.get('apikey') ?? '')) return reply(401, { error: 'invalid application key.' });
  try {
    if (!req.headers.get('content-type')?.includes('application/json')) return reply(415, { error: 'invalid request.' });
    if (Number(req.headers.get('content-length')) > 16000) return reply(413, { error: 'the form is too large.' });
    // Bound streamed bodies too; Content-Length alone is untrusted.
    const reader = req.body?.getReader(); if (!reader) return reply(400, { error: 'invalid form.' });
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength;
      if (size > 16000) { await reader.cancel(); return reply(413, { error: 'the form is too large.' }); } chunks.push(value); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const input = JSON.parse(new TextDecoder().decode(bytes));
    if (input.website || typeof input.elapsed !== 'number' || input.elapsed < 2000) return reply(400, { error: 'please check the form and try again.' });
    const payload = validateWaitlist(input);
    // IP throttling is only one layer: independent email and global quotas are enforced atomically in Postgres.
    const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${serviceKey}:${ip}`));
    const fingerprint = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
    const { data, error } = await server.rpc('submit_waitlist', { payload, fingerprint });
    if (error) return reply(error.message.includes('too many submissions') ? 429 : 503, { error: error.message.includes('too many submissions') ? 'too many submissions. please try again later.' : 'could not save your request. please try again later.' });
    return reply(201, { id: data });
  } catch (error) {
    return reply(400, { error: error instanceof SyntaxError ? 'invalid form.' : error instanceof Error && error.message.startsWith('please ') ? error.message : 'invalid form.' });
  }
});
