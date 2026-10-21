import { copyFile, cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dist = resolve(root, 'frontend/dist');
const index = await readFile(resolve(dist, 'index.html'), 'utf8');
// Real entry documents let GitHub Pages serve direct links and refreshes with 200,
// retaining Auth URL fragments without a JavaScript redirect through the homepage.
const routes = ['flashbook', 'flashes', 'tattoos', 'waitlist', 'other', 'admin'];
for (const route of routes) {
  const folder = resolve(dist, route);
  await mkdir(folder, { recursive: true });
  const routeUrl = `https://jasup2001.site/${route}/`;
  const html = index.replace(/<title>[^<]*<\/title>/, `<title>${route} — jasup2001</title>`)
    .replace('rel="canonical" href="https://jasup2001.site/"', `rel="canonical" href="${routeUrl}"`)
    .replace('property="og:url" content="https://jasup2001.site/"', `property="og:url" content="${routeUrl}"`);
  await writeFile(resolve(folder, 'index.html'), html);
}
await copyFile(resolve(dist, 'index.html'), resolve(dist, '404.html'));
await copyFile(resolve(root, 'CNAME'), resolve(dist, 'CNAME'));
await writeFile(resolve(dist, '.nojekyll'), '');
// Keep the original production media URLs available alongside the new galleries.
await cp(resolve(root, 'img'), resolve(dist, 'img'), { recursive: true });
for (const file of ['logo.png', 'logo2.png', 'favicon.png', 'style.css']) {
  await copyFile(resolve(root, file), resolve(dist, file));
}
console.log('prepared GitHub Pages entry documents, domain and original media URLs');
