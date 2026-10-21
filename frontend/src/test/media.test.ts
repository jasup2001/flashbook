// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { validateMedia } from '../features/admin/media';
describe('upload restrictions', () => {
  it('checks the file signature as well as its declared mime type', async () => {
    const png = new File([new Uint8Array([0x89, 80, 78, 71, 13, 10, 26, 10])], 'image.png', { type: 'image/png' });
    await expect(validateMedia(png, true)).resolves.toBe('image/png');
    await expect(validateMedia(new File(['<script>not an image</script>'], 'image.png', { type: 'image/png' }), true)).rejects.toThrow('choose a png');
    await expect(validateMedia(new File(['<svg></svg>'], 'image.svg', { type: 'image/svg+xml' }))).rejects.toThrow();
  });
  it('rejects videos in flashbook and oversized images', async () => {
    const video = new File(['....ftypisom....'], 'video.mp4', { type: 'video/mp4' });
    await expect(validateMedia(video)).resolves.toBe('video/mp4');
    await expect(validateMedia(video, true)).rejects.toThrow();
    const large = new File([new Uint8Array([0x89, 80, 78, 71])], 'image.png', { type: 'image/png' });
    Object.defineProperty(large, 'size', { value: 21 * 1024 * 1024 });
    await expect(validateMedia(large, true)).rejects.toThrow('20 mb');
  });
});
