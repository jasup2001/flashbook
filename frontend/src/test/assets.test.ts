import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import flashes from '../data/flashes.json';

const repo = resolve(import.meta.dirname, '../../..');
const hash = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex');

describe('asset preservation and delivery', () => {
  it('preserves every original production file against the pre-redesign SHA-256 inventory', async () => {
    const inventory = JSON.parse((await readFile(resolve(repo, 'docs/legacy-checksums.json'), 'utf8')).replace(/^\uFEFF/, ''));
    for (const [file, checksum] of Object.entries(inventory)) {
      const buffer = await readFile(resolve(repo, file));
      // Git can check out text as CRLF on Windows and LF on Linux.
      const canonical = /\.(png|jpe?g)$/i.test(file) ? buffer : Buffer.from(buffer.toString('utf8').replace(/\r\n/g, '\n'));
      expect(hash(canonical), file).toBe(checksum);
    }
  });

  it('includes all 51 source sheets, lossless original copies, and three smaller WebP derivatives', async () => {
    const source = (await readdir(resolve(repo, 'img'))).filter((name) => /\.(png|jpe?g)$/i.test(name));
    expect(source).toHaveLength(51);
    expect(new Set(flashes.map((flash) => flash.file))).toEqual(new Set(source));
    for (const flash of flashes) {
      const original = await readFile(resolve(repo, 'frontend/public', decodeURIComponent(flash.original.slice(1))));
      expect(hash(original), flash.file).toBe(flash.sha256);
      expect(flash.thumbnails.map((item) => item.width)).toEqual([360, 720, 1200]);
      for (const thumbnail of flash.thumbnails) {
        const buffer = await readFile(resolve(repo, 'frontend/public', decodeURIComponent(thumbnail.src.slice(1))));
        const metadata = await sharp(buffer).metadata();
        expect(metadata.format).toBe('webp');
        expect(metadata.width).toBe(thumbnail.width);
        expect(buffer.length).toBeLessThan(flash.bytes);
      }
    }
  });
});
