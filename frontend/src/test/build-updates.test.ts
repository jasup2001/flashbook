import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { watchBuildUpdates } from '../lib/buildUpdates';

const html = (version: string) => `<script type="module" src="/assets/index-${version}.js"></script>`;
const cleanup: (() => void)[] = [];
function setup(fetcher = vi.fn().mockResolvedValue(new Response(html('new')))) {
  document.body.innerHTML = html('old');
  const navigate = vi.fn();
  const watcher = watchBuildUpdates({ fetcher, navigate });
  cleanup.push(watcher.dispose);
  return { ...watcher, fetcher, navigate };
}
afterEach(() => {
  cleanup.splice(0).forEach(dispose => dispose());
  window.history.replaceState(null, '', '/');
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('deployment updates', () => {
  it('revalidates the canonical page and navigates to the new build while preserving route, query and fragment', async () => {
    window.history.replaceState(null, '', '/flashbook/?test=1&__build=old#design-03');
    const { check, fetcher, navigate } = setup();
    expect(await check()).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(`${window.location.origin}/flashbook/?test=1`, expect.objectContaining({ cache: 'reload' }));
    expect(navigate).toHaveBeenCalledExactlyOnceWith(`${window.location.origin}/flashbook/?test=1&__build=index-new.js#design-03`);
    await check();
    expect(navigate).toHaveBeenCalledTimes(1);
  });
  it('keeps a matching build and does not loop if navigation still serves old HTML', async () => {
    const watcher = setup(vi.fn().mockResolvedValueOnce(new Response(html('old'))).mockResolvedValueOnce(new Response(html('new'))));
    expect(await watcher.check()).toBe(false);
    window.history.replaceState(null, '', '/?__build=index-new.js');
    expect(await watcher.check()).toBe(false);
    expect(watcher.navigate).not.toHaveBeenCalled();
  });
  it('checks again when a cached page is restored', async () => {
    const watcher = setup();
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    await vi.waitFor(() => expect(watcher.navigate).toHaveBeenCalledOnce());
  });
  it('does not interrupt admin imports or unsaved form input', async () => {
    const watcher = setup();
    window.history.replaceState(null, '', '/admin/');
    expect(await watcher.check()).toBe(false);
    window.history.replaceState(null, '', '/waitlist/');
    const form = document.createElement('form');
    const input = document.createElement('input');
    form.append(input); document.body.append(form);
    fireEvent.input(input, { target: { value: 'my tattoo idea' } });
    expect(await watcher.check()).toBe(false);
    expect(watcher.fetcher).not.toHaveBeenCalled();
    form.remove();
    expect(await watcher.check()).toBe(true);
  });
  it('keeps the current page usable offline or when a check returns an invalid document', async () => {
    const watcher = setup(vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(new Response('<html>unavailable</html>')));
    expect(await watcher.check()).toBe(false);
    expect(await watcher.check()).toBe(false);
    expect(watcher.navigate).not.toHaveBeenCalled();
  });
  it('does not reload if the user starts typing while the version request is pending', async () => {
    let resolve!: (value: Response) => void;
    const watcher = setup(vi.fn(() => new Promise<Response>(done => { resolve = done; })));
    const checking = watcher.check();
    const form = document.createElement('form');
    const input = document.createElement('input');
    form.append(input); document.body.append(form);
    fireEvent.input(input);
    resolve(new Response(html('new')));
    expect(await checking).toBe(false);
    expect(watcher.navigate).not.toHaveBeenCalled();
  });
});
