import { readdir, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const output = resolve(root, 'frontend/public/media');
const data = resolve(root, 'frontend/src/data');
const files = (await readdir(resolve(root, 'img')))
  .filter((name) => /\.(png|jpe?g)$/i.test(name))
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

// Only generated output is replaced. The source img/ and logos are never written.
await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, 'thumbs'), { recursive: true });
await mkdir(resolve(output, 'originals'), { recursive: true });
await mkdir(data, { recursive: true });

let originalBytes = 0;
let thumbnailBytes = 0;
const flashes = [];
for (const [index, file] of files.entries()) {
  const source = resolve(root, 'img', file);
  const buffer = await readFile(source);
  const metadata = await sharp(buffer).metadata();
  const id = parse(file).name;
  const thumbnails = [];
  for (const width of [360, 720, 1200]) {
    const name = `${id}-${width}.webp`;
    let { data: thumbnail, info: result } = await sharp(buffer)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toBuffer({ resolveWithObject: true });
    // A few highly compressed line-art PNGs need a smaller WebP quality budget.
    if (thumbnail.length >= buffer.length) {
      ({ data: thumbnail, info: result } = await sharp(buffer)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 60, effort: 5 })
        .toBuffer({ resolveWithObject: true }));
    }
    await writeFile(resolve(output, 'thumbs', name), thumbnail);
    thumbnailBytes += result.size;
    thumbnails.push({ width: result.width, src: `/media/thumbs/${encodeURIComponent(name)}`, bytes: result.size });
  }
  await copyFile(source, resolve(output, 'originals', file));
  originalBytes += buffer.length;
  flashes.push({
    id, file, number: String(index + 1).padStart(2, '0'),
    width: metadata.width, height: metadata.height,
    original: `/media/originals/${encodeURIComponent(file)}`,
    bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex'),
    thumbnails,
  });
}
for (const file of ['logo.png', 'logo2.png', 'favicon.png']) {
  await copyFile(resolve(root, file), resolve(output, file));
}
await writeFile(resolve(data, 'flashes.json'), `${JSON.stringify(flashes, null, 2)}\n`);
console.log(`Prepared ${flashes.length} sheets. Originals: ${(originalBytes / 1048576).toFixed(2)} MiB; all 3 WebP sizes: ${(thumbnailBytes / 1048576).toFixed(2)} MiB.`);
