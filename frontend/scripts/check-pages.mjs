import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dist = resolve(root, 'frontend/dist');
const routes = ['', 'flashbook/', 'flashes/', 'tattoos/', 'waitlist/', 'other/', 'admin/'];
for (const route of routes) {
  const html = await readFile(resolve(dist, route, 'index.html'), 'utf8');
  assert(html.includes('<div id="root"></div>'), `missing app entry at /${route}`);
  const script = html.match(/src="(\/assets\/[^" ]+\.js)"/);
  assert(script, `missing compiled app script at /${route}`);
  await readFile(resolve(dist, script[1].slice(1)));
  assert(!html.includes('/src/main.tsx'), 'source entry was not built');
  assert(html.includes('property="og:title" content="jasup2001site digital archive"'), `missing share title at /${route}`);
  assert(html.includes('property="og:image" content="https://jasup2001.site/logo2.png"'), `missing share logo at /${route}`);
  assert(html.includes(`property="og:url" content="https://jasup2001.site/${route}"`), `wrong share URL at /${route}`);
  assert(html.includes(`rel="canonical" href="https://jasup2001.site/${route}"`), `wrong canonical URL at /${route}`);
}
assert.equal((await readFile(resolve(dist, 'CNAME'), 'utf8')).trim(), 'jasup2001.site');
assert.equal(await readFile(resolve(dist, '404.html'), 'utf8'), await readFile(resolve(dist, 'index.html'), 'utf8'));
await readFile(resolve(dist, '.nojekyll'));
const inventory = JSON.parse(await readFile(resolve(root, 'docs/legacy-checksums.json'), 'utf8'));
for (const file of Object.keys(inventory).filter(file => /\.(png|jpe?g)$/i.test(file))) {
  const bytes = await readFile(resolve(dist, file));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), inventory[file], `original URL changed: ${file}`);
}
console.log('passed: direct route entries, compiled scripts, custom domain, 404 fallback and original media URLs');
