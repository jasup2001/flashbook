// Uses only the ignored local publishable configuration; never reads an admin session.
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
assert(url && key, 'run with node --env-file=.env.local scripts/check-backend.mjs');
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const settings = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } }).then(r => r.json());
assert.equal(settings.disable_signup, true, 'public account registration must be disabled');
const designs = await client.from('flash_designs').select('id,status,asset:portfolio_assets(legacy_key)').order('sort_order');
assert.equal(designs.error, null);
assert.equal(designs.data.filter(d => d.asset?.legacy_key).length, 51);
assert(designs.data.every(d => d.status === 'published'));
const submissions = await client.from('waitlist_entries').select('id');
assert(submissions.error, 'anonymous visitors must not read submissions');
const directInsert = await client.from('waitlist_entries').insert({ instagram: '@test', email: 'test@example.com', idea: 'test' });
assert(directInsert.error, 'anonymous visitors must not insert directly');
for (const origin of ['http://127.0.0.1:5174', 'http://127.0.0.1:4173']) {
  const preflight = await fetch(`${url}/functions/v1/submit-waitlist`, { method: 'OPTIONS', headers: { Origin: origin } });
  assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
  const response = await fetch(`${url}/functions/v1/submit-waitlist`, {
    method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ instagram: '@test', email: 'invalid', idea: 'test', elapsed: 5000, website: '' }),
  });
  const result = await response.json();
  assert.equal(response.status, 400, JSON.stringify(result));
  assert.match(result.error, /valid email/);
  const instagramPreflight = await fetch(`${url}/functions/v1/instagram-import`, { method: 'OPTIONS', headers: { Origin: origin } });
  assert.equal(instagramPreflight.status, 204); assert.equal(instagramPreflight.headers.get('access-control-allow-origin'), origin);
  const instagramDenied = await fetch(`${url}/functions/v1/instagram-import`, { method: 'POST',
    headers: { Origin: origin, apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status' }) });
  assert.equal(instagramDenied.status, 401, 'a publishable key must never authorize instagram access');
}
for (const rpc of ['instagram_connection_read', 'instagram_connection_save', 'instagram_import_save']) {
  const result = await client.rpc(rpc, {});
  assert(result.error, 'server-only instagram RPC must not be callable by visitors');
}
console.log('passed: disabled signups, 51 originals, anonymous restrictions, waitlist validation, instagram CORS and authorization');
const privateAsset = process.argv[2];
if (privateAsset) {
  assert.match(privateAsset, /^[0-9a-f-]{36}$/);
  const asset = await client.from('portfolio_assets').select('id').eq('id', privateAsset);
  assert.equal(asset.error, null); assert.equal(asset.data.length, 0, 'a private upload must be hidden');
  const signed = await client.storage.from('portfolio-media').createSignedUrl(`${privateAsset}/360.webp`, 60);
  assert(signed.error, 'an anonymous visitor must not sign a private file');
  console.log('passed: private Storage upload cannot be read or signed anonymously');
}
