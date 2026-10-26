const entrySelector = 'script[type="module"][src^="/assets/"]';
const validEntry = /^\/assets\/index-[\w-]+\.js$/;

/** Revalidate GitHub Pages HTML, including when a tab returns from memory cache. */
export function watchBuildUpdates({ fetcher = fetch, navigate = (url: string) => window.location.replace(url) } = {}) {
  const entry = document.querySelector<HTMLScriptElement>(entrySelector)?.getAttribute('src');
  const dirtyForms = new WeakSet<HTMLFormElement>();
  let pending = false;
  let replacing = false;
  let disposed = false;
  const safeToUpdate = () => !/^\/admin(?:\/|$)/i.test(window.location.pathname)
    && ![...document.forms].some(form => dirtyForms.has(form));
  const markDirty = (event: Event) => {
    const form = event.target instanceof Element ? event.target.closest('form') : null;
    if (form) dirtyForms.add(form);
  };
  const check = async () => {
    if (!entry || !validEntry.test(entry) || pending || replacing || disposed || document.hidden || !safeToUpdate()) return false;
    pending = true;
    try {
      const address = new URL(window.location.href);
      address.hash = '';
      address.searchParams.delete('__build');
      // Unlike no-store, reload also replaces the old HTML in the browser's HTTP cache.
      const response = await fetcher(address.href, { cache: 'reload', credentials: 'same-origin', signal: AbortSignal.timeout(3000) });
      if (!response.ok) return false;
      const html = new DOMParser().parseFromString(await response.text(), 'text/html');
      const latest = html.querySelector<HTMLScriptElement>(entrySelector)?.getAttribute('src');
      if (!latest || !validEntry.test(latest) || latest === entry || disposed || !safeToUpdate()) return false;
      const target = new URL(window.location.href);
      const version = latest.split('/').at(-1)!;
      if (target.searchParams.get('__build') === version) return false;
      target.searchParams.set('__build', version);
      replacing = true;
      navigate(target.href);
      return true;
    } catch {
      // Offline or failed checks leave the current page usable.
      return false;
    } finally { pending = false; }
  };
  const resume = () => { if (!document.hidden) void check(); };
  const pageshow = (event: PageTransitionEvent) => { if (event.persisted) resume(); };
  document.addEventListener('input', markDirty, true);
  document.addEventListener('change', markDirty, true);
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('focus', resume);
  window.addEventListener('pageshow', pageshow);
  return {
    check,
    dispose() {
      disposed = true;
      document.removeEventListener('input', markDirty, true);
      document.removeEventListener('change', markDirty, true);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
      window.removeEventListener('pageshow', pageshow);
    },
  };
}
