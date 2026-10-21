import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { downloadMedia, graph, InstagramError, manifestFor, ownPost, signManifest, verifyManifest } from '../_shared/instagram.ts';

const origins = new Set(['http://127.0.0.1:5174', 'http://localhost:5174', 'http://127.0.0.1:4173', 'http://localhost:4173', 'https://jasup2001.site', 'https://www.jasup2001.site']);
const url = Deno.env.get('SUPABASE_URL')!;
const secret = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const publishable = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}').default || Deno.env.get('SUPABASE_ANON_KEY')!;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const server = createClient(url, secret, options);
type Connection = { token: string; user_id: string; username: string; renewed_at: string; expires_at: string };
async function saveConnection(token: string, userId: string, username: string, expiry: string) {
  const { error } = await server.rpc('instagram_connection_save', { access_token: token, ig_user_id: userId, ig_username: username, expiry });
  if (error) throw new InstagramError('could not save the instagram connection.', 503);
}
async function connection() {
  const { data, error } = await server.rpc('instagram_connection_read');
  if (error) throw new InstagramError('could not read the instagram connection.', 503);
  return data as Connection | null;
}
async function refresh(current: Connection) {
  if (Date.parse(current.expires_at) <= Date.now()) throw new InstagramError('instagram access has expired. reconnect your account.');
  if (Date.parse(current.renewed_at) > Date.now() - 7 * 86400000) return current;
  const endpoint = new URL('https://graph.instagram.com/refresh_access_token');
  endpoint.searchParams.set('grant_type', 'ig_refresh_token');
  // This OAuth endpoint documents access_token as a query parameter. Keep the URL
  // server-side, never log it, and never expose its raw response or errors.
  endpoint.searchParams.set('access_token', current.token);
  const response = await fetch(endpoint, { redirect: 'error', signal: AbortSignal.timeout(20000) });
  const body = await response.json();
  if (!response.ok || typeof body.access_token !== 'string' || !Number.isFinite(body.expires_in) || body.expires_in <= 0 || body.expires_in > 61 * 86400) {
    throw new InstagramError('instagram could not renew access. reconnect the account with a new dashboard token.', 502);
  }
  const expires_at = new Date(Date.now() + body.expires_in * 1000).toISOString();
  await saveConnection(body.access_token, current.user_id, current.username, expires_at);
  return { ...current, token: body.access_token, expires_at };
}
async function readBody(req: Request) {
  if (!req.headers.get('content-type')?.includes('application/json')) throw new InstagramError('invalid request.');
  if (Number(req.headers.get('content-length')) > 80000) throw new InstagramError('request too large.', 413);
  const reader = req.body?.getReader(); if (!reader) throw new InstagramError('invalid request.');
  const chunks = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength;
    if (size > 80000) { await reader.cancel(); throw new InstagramError('request too large.', 413); } chunks.push(value); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function handle(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  const cors = { 'Access-Control-Allow-Origin': origins.has(origin) ? origin : 'null', 'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Cache-Control': 'no-store' };
  const reply = (status: number, body: object) => Response.json(body, { status, headers: cors });
  if (!origins.has(origin)) return reply(403, { error: 'this origin is not allowed.' });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'method not allowed.' });
  try {
    const bearer = req.headers.get('authorization') ?? '';
    if (!bearer.startsWith('Bearer ')) return reply(401, { error: 'sign in to the admin panel first.' });
    const userClient = createClient(url, publishable, { ...options, global: { headers: { Authorization: bearer } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser(bearer.slice(7));
    if (authError || !user) return reply(401, { error: 'your session has expired. sign in again.' });
    const { data: admin, error: roleError } = await userClient.rpc('is_portfolio_admin');
    if (roleError || admin !== true) return reply(403, { error: 'admin access is required.' });
    // No privileged DB or Meta request is made before both checks above succeed.
    const input = await readBody(req);
    if (input.action === 'connect') {
      if (typeof input.token !== 'string' || !/^[A-Za-z0-9._-]{50,4096}$/.test(input.token)) throw new InstagramError('paste the newly generated instagram dashboard token.');
      const raw = await graph<{ user_id?: string; id?: string; username?: string; data?: { user_id?: string; id?: string; username?: string }[] }>(input.token, 'me', { fields: 'user_id,username' });
      const profile = raw.data?.[0] ?? raw;
      if (profile.username?.toLowerCase() !== 'jasup2001' || !/^\d+$/.test(profile.user_id ?? '')) throw new InstagramError('connect the @jasup2001 professional account.');
      // Dashboard tokens last 60 days. The setup form explicitly requires a fresh token.
      const expiry = new Date(Date.now() + 59 * 86400000).toISOString();
      await saveConnection(input.token, profile.user_id!, 'jasup2001', expiry);
      return reply(200, { connected: true, username: 'jasup2001', expires_at: expiry });
    }
    if (input.action === 'status') {
      const current = await connection();
      if (!current) return reply(200, { connected: false });
      if (Date.parse(current.expires_at) <= Date.now()) return reply(200, { connected: false, expired: true });
      const renewed = await refresh(current);
      return reply(200, { connected: true, username: renewed.username, expires_at: renewed.expires_at });
    }
    if (input.action === 'prepare') {
      const current = await connection();
      if (!current) throw new InstagramError('connect your instagram account first.');
      const active = await refresh(current);
      const media = await ownPost(active.token, active.user_id, input.url);
      const { data: existing, error } = await server.from('tattoo_posts').select('id').eq('instagram_id', media.id).maybeSingle();
      if (error) throw new InstagramError('could not check existing posts.', 503);
      if (existing) throw new InstagramError('this post has already been imported. check drafts and archived posts.');
      const manifest = manifestFor(media, user.id);
      return reply(200, { ticket: await signManifest(manifest, secret), permalink: manifest.permalink,
        slides: manifest.slides.map(s => ({ id: s.id, kind: s.kind, hasCover: !!s.cover })) });
    }
    if (input.action === 'download') {
      const manifest = await verifyManifest(input.ticket, user.id, secret);
      if (!Number.isInteger(input.index) || input.index < 0 || input.index >= manifest.slides.length) throw new InstagramError('invalid slide.');
      const { stream, type } = await downloadMedia(manifest.slides[input.index], input.cover === true);
      return new Response(stream, { headers: { ...cors, 'Content-Type': type, 'X-Content-Type-Options': 'nosniff' } });
    }
    if (input.action === 'commit') {
      const manifest = await verifyManifest(input.ticket, user.id, secret);
      if (!Array.isArray(input.asset_ids) || input.asset_ids.length !== manifest.slides.length ||
        new Set(input.asset_ids).size !== manifest.slides.length || input.asset_ids.some((id: unknown) => typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id))) throw new InstagramError('upload every slide before saving the post.');
      const { data, error } = await server.rpc('instagram_import_save', { media_id: manifest.id, media_permalink: manifest.permalink,
        media_timestamp: manifest.timestamp, asset_ids: input.asset_ids });
      if (error) throw new InstagramError(error.message.includes('already been imported') ? 'this post has already been imported. check drafts and archived posts.' : 'could not save the post. uploaded files remain in your private library.', 409);
      return reply(201, { id: data });
    }
    throw new InstagramError('unknown action.');
  } catch (error) {
    // Never forward raw Meta/DB errors: they can contain credentials or private URLs.
    return reply(error instanceof InstagramError ? error.status : 503, { error: error instanceof InstagramError ? error.message : 'the import could not finish. try again or upload the original files manually.' });
  }
}
Deno.serve(handle);
