import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ load: vi.fn(), publish: vi.fn(), reorder: vi.fn(), upload: vi.fn() }));
vi.mock('../features/admin/api', () => ({
  db: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'test-session' } } }) } }),
  loadPosts: mocks.load, setPublication: mocks.publish, reorder: mocks.reorder,
}));
vi.mock('../features/admin/media', () => ({ uploadMedia: mocks.upload }));
import { importInstagramFeed } from '../features/admin/instagram';

beforeEach(() => { vi.clearAllMocks(); mocks.publish.mockResolvedValue(undefined); mocks.reorder.mockResolvedValue(undefined); });
afterEach(() => vi.unstubAllGlobals());
const post = (id: string) => ({ id, url: `https://www.instagram.com/p/${id}/`, timestamp: '2026-10-21T12:00:00Z' });

describe('entire instagram feed import', () => {
  it('reads every page, reuses existing posts, publishes drafts, skips duplicates, continues after an unavailable reel and restores feed order', async () => {
    const existing = [{ id: 'draft', instagram_id: '2', status: 'draft' }, { id: 'live', instagram_id: '3', status: 'published' }, { id: 'manual', instagram_id: null, status: 'draft' }];
    mocks.load.mockResolvedValueOnce(existing).mockResolvedValueOnce([...existing, { id: 'new', instagram_id: '1' }]);
    mocks.upload.mockResolvedValue({ id: 'asset' });
    const actions: Record<string, unknown>[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
      const body = JSON.parse(options.body); actions.push(body);
      if (body.action === 'list') return Response.json(body.after ? { posts: [post('3'), post('4')], next: null } : { posts: [post('1'), post('2'), post('2')], next: 'page2' });
      if (body.action === 'prepare') return body.url.includes('/4/') ? Response.json({ error: 'video unavailable' }, { status: 400 }) : Response.json({ ticket: 'ticket', slides: [{ id: 'slide', kind: 'image' }] });
      if (body.action === 'download') return new Response('file', { headers: { 'Content-Type': 'image/jpeg' } });
      return Response.json({ id: 'new' });
    }));
    const result = await importInstagramFeed(vi.fn());
    expect(result).toMatchObject({ total: 4, imported: 1, published: 3 });
    expect(result.failed).toEqual([{ url: post('4').url, error: 'video unavailable' }]);
    expect(actions.filter(a => a.action === 'prepare').map(a => a.url)).toEqual([post('1').url, post('4').url]);
    expect(mocks.publish.mock.calls).toEqual([['tattoo_posts', 'new', 'published'], ['tattoo_posts', 'draft', 'published']]);
    expect(mocks.reorder).toHaveBeenCalledExactlyOnceWith('tattoos', ['new', 'draft', 'live', 'manual']);
  });

  it('aborts repeated pagination before uploading or publishing any media', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ posts: [post('1')], next: 'repeated' })));
    await expect(importInstagramFeed(vi.fn())).rejects.toThrow('repeated a feed page');
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(mocks.reorder).not.toHaveBeenCalled();
  });
});
