import { afterEach, describe, expect, it, vi } from 'vitest';
import { lockPageScroll } from '../lib/lockPageScroll';

afterEach(() => {
  document.body.removeAttribute('style');
  document.documentElement.removeAttribute('style');
  vi.restoreAllMocks();
});

describe('gallery scroll lock', () => {
  it('pins a scrolled page and restores its position and existing styles', () => {
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(1250);
    vi.spyOn(window, 'scrollX', 'get').mockReturnValue(4);
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(390);
    const scrollTo = vi.spyOn(window, 'scrollTo').mockClear();
    document.body.style.cssText = 'position: relative; width: 95%; color: red;';
    document.documentElement.style.overflow = 'auto';

    const unlock = lockPageScroll();
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.top).toBe('-1250px');
    expect(document.body.style.left).toBe('-4px');
    expect(document.body.style.width).toBe('390px');
    expect(document.documentElement.style.overflow).toBe('hidden');

    unlock();
    expect(document.body.style.position).toBe('relative');
    expect(document.body.style.width).toBe('95%');
    expect(document.body.style.color).toBe('red');
    expect(document.body.style.top).toBe('');
    expect(document.documentElement.style.overflow).toBe('auto');
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ left: 4, top: 1250, behavior: 'instant' });
  });

  it.each([true, false])('keeps the background locked until both nested viewers close (inner first: %s)', innerFirst => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockClear();
    const outer = lockPageScroll();
    const inner = lockPageScroll();
    const first = innerFirst ? inner : outer;
    const last = innerFirst ? outer : inner;
    first();
    first(); // A repeated cleanup must not release another dialog's lock.
    expect(document.body.style.position).toBe('fixed');
    expect(scrollTo).not.toHaveBeenCalled();
    last();
    expect(document.body.style.position).toBe('');
    expect(document.body.style.overflow).toBe('');
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });
});
