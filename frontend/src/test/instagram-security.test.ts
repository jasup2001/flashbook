// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { downloadMedia, instagramLink, manifestFor, mediaUrl, ownPost, signManifest, verifyManifest } from '../../../supabase/functions/_shared/instagram';

const image = { id: '123', media_type: 'IMAGE', media_url: 'https://scontent.cdninstagram.com/photo.jpg',
  permalink: 'https://www.instagram.com/p/AbC_123/', timestamp: '2026-10-20T10:00:00+0000' };
describe('official instagram import boundaries', () => {
  it('normalizes tracking links while retaining case-sensitive shortcodes', () => {
    expect(instagramLink('https://instagram.com/reel/AbC_123?igsh=test')).toEqual({ shortcode: 'AbC_123', url: 'https://www.instagram.com/reel/AbC_123/' });
    expect(instagramLink('https://www.instagram.com/jasup2001/p/AbC_123/').url).toBe('https://www.instagram.com/p/AbC_123/');
  });
  it.each(['http://instagram.com/p/abc/', 'https://instagram.com.evil.test/p/abc/', 'https://user:pass@instagram.com/p/abc/',
    'https://instagram.com:8443/p/abc/', 'https://instagram.com/jasup2001/', 'https://evil.test/p/abc/'])('rejects non-post URLs: %s', value => {
    expect(() => instagramLink(value)).toThrow('paste an instagram');
  });
  it.each(['http://scontent.cdninstagram.com/a', 'https://cdninstagram.com.evil.test/a', 'https://127.0.0.1/a',
    'https://scontent.cdninstagram.com:8443/a', 'https://user@fbcdn.net/a'])('rejects untrusted media URLs: %s', value => {
    expect(() => mediaUrl(value)).toThrow();
  });
  it('finds a post in the connected account only and rebuilds cursor URLs', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ data: [{ id: '777', permalink: 'https://www.instagram.com/p/other/' }],
      paging: { next: 'https://evil.test/steal-token', cursors: { after: 'cursor1' } } }))
      .mockResolvedValueOnce(Response.json({ data: [image] })).mockResolvedValueOnce(Response.json(image));
    expect((await ownPost('private-token', '999', image.permalink, fetcher)).id).toBe('123');
    expect(fetcher).toHaveBeenCalledTimes(3);
    for (const [address, options] of fetcher.mock.calls) {
      expect(new URL(address).hostname).toBe('graph.instagram.com');
      expect(new URL(address).href).not.toContain('private-token');
      expect(options.headers.Authorization).toBe('Bearer private-token');
    }
    expect(new URL(fetcher.mock.calls[1][0]).searchParams.get('after')).toBe('cursor1');
  });
  it('never fetches an arbitrary media ID when the link is absent from the owner feed', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ data: [] }));
    await expect(ownPost('token', '999', image.permalink, fetcher)).rejects.toThrow('not found');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('retains mixed carousel order and rejects a missing licensed video file', () => {
    const video = { id: '124', media_type: 'VIDEO', media_url: 'https://video.fbcdn.net/reel.mp4', thumbnail_url: 'https://scontent.cdninstagram.com/cover.jpg' };
    const result = manifestFor({ ...image, media_type: 'CAROUSEL_ALBUM', children: { data: [image, video] } }, 'owner');
    expect(result.slides.map(s => [s.id, s.kind])).toEqual([['123', 'image'], ['124', 'video']]);
    expect(result.slides[1].cover).toContain('cover.jpg');
    expect(result).not.toHaveProperty('caption');
    expect(() => manifestFor({ ...video, media_url: undefined, permalink: image.permalink, timestamp: image.timestamp }, 'owner')).toThrow('licensed music');
  });
  it('binds signed imports to the owner and rejects changes, replay after expiry, and wrong keys', async () => {
    const manifest = manifestFor(image, 'owner');
    const ticket = await signManifest(manifest, 'server-secret');
    expect((await verifyManifest(ticket, 'owner', 'server-secret')).id).toBe('123');
    await expect(verifyManifest(ticket, 'other-user', 'server-secret')).rejects.toThrow('invalid');
    await expect(verifyManifest(ticket, 'owner', 'wrong-secret')).rejects.toThrow('invalid');
    await expect(verifyManifest(`A${ticket.slice(1)}`, 'owner', 'server-secret')).rejects.toThrow('invalid');
    const expired = await signManifest({ ...manifest, expires: Date.now() - 1 }, 'server-secret');
    await expect(verifyManifest(expired, 'owner', 'server-secret')).rejects.toThrow('expired');
  });
  it('rejects CDN redirects to private addresses without forwarding credentials', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/internal' } }));
    await expect(downloadMedia(manifestFor(image, 'owner').slides[0], false, fetcher)).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]).not.toHaveProperty('headers');
  });
  it('enforces both declared and streamed download limits', async () => {
    const slide = manifestFor(image, 'owner').slides[0];
    const oversized = vi.fn().mockResolvedValue(new Response('x', { headers: { 'content-type': 'image/jpeg', 'content-length': String(21 * 1024 * 1024) } }));
    await expect(downloadMedia(slide, false, oversized)).rejects.toThrow('20 mb');
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(21 * 1024 * 1024)); controller.close(); } });
    const chunked = vi.fn().mockResolvedValue(new Response(stream, { headers: { 'content-type': 'image/jpeg' } }));
    const downloaded = await downloadMedia(slide, false, chunked);
    await expect(new Response(downloaded.stream).arrayBuffer()).rejects.toThrow('upload limit');
  });
});
