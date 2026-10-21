import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ upload: vi.fn(), session: vi.fn() }));
vi.mock('../features/admin/api', () => ({ db: () => ({ auth: { getSession: mocks.session } }) }));
vi.mock('../features/admin/media', () => ({ uploadMedia: mocks.upload }));
import { importInstagram } from '../features/admin/instagram';
beforeEach(() => {
  vi.clearAllMocks(); mocks.session.mockResolvedValue({ data: { session: { access_token: 'user-session' } }, error: null });
});
describe('instagram download, upload and draft workflow', () => {
  it('commits the original slide order only after all files and the video cover upload', async () => {
    const calls: { action: string; index?: number; cover?: boolean; asset_ids?: string[] }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
      const body = JSON.parse(options.body); calls.push(body);
      if (body.action === 'prepare') return Response.json({ ticket: 'signed', slides: [{ id: '1', kind: 'image' }, { id: '2', kind: 'video', hasCover: true }] });
      if (body.action === 'download') return new Response('file', { headers: { 'content-type': body.index === 1 && !body.cover ? 'video/mp4' : 'image/jpeg' } });
      return Response.json({ id: 'draft-id' });
    }));
    mocks.upload.mockResolvedValueOnce({ id: 'asset-photo' }).mockResolvedValueOnce({ id: 'asset-reel' });
    const progress = vi.fn();
    expect(await importInstagram('https://www.instagram.com/p/abc/', progress)).toEqual({ id: 'draft-id' });
    expect(calls.map(c => c.action)).toEqual(['prepare', 'download', 'download', 'download', 'commit']);
    expect(calls[3]).toMatchObject({ index: 1, cover: true });
    expect(calls[4].asset_ids).toEqual(['asset-photo', 'asset-reel']);
    expect(mocks.upload.mock.calls[1][0].name).toBe('instagram-2.mp4');
    expect(mocks.upload.mock.calls[1][2].name).toBe('instagram-2-cover.jpg');
    vi.unstubAllGlobals();
  });
  it('never commits a partial carousel after a download fails', async () => {
    const actions: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
      const body = JSON.parse(options.body); actions.push(body.action);
      if (body.action === 'prepare') return Response.json({ ticket: 'signed', slides: [{ id: '1', kind: 'image' }, { id: '2', kind: 'video' }] });
      return body.index === 0 ? new Response('photo', { headers: { 'content-type': 'image/jpeg' } })
        : Response.json({ error: 'video unavailable.' }, { status: 400 });
    }));
    mocks.upload.mockResolvedValue({ id: 'private-photo' });
    await expect(importInstagram('https://www.instagram.com/p/abc/', vi.fn())).rejects.toThrow('private library');
    expect(actions).not.toContain('commit'); expect(mocks.upload).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
