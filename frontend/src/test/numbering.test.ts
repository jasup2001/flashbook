import { describe, expect, it } from 'vitest';
import { numberDesigns } from '../features/flashes/numbering';

describe('position-based design numbers', () => {
  it('renumbers reordered and hidden designs while preserving their identities', () => {
    const original = [{ id: 'a', number: '01' }, { id: 'b', number: '02' }, { id: 'c', number: '03' }];
    const reordered = numberDesigns([original[2], original[0]]);
    expect(reordered).toEqual([{ id: 'c', number: '01' }, { id: 'a', number: '02' }]);
    expect(original[2].number).toBe('03');
  });

  it('continues beyond two digits and handles an empty gallery', () => {
    expect(numberDesigns([])).toEqual([]);
    const designs = numberDesigns(Array.from({ length: 101 }, (_, id) => ({ id })));
    expect(designs[8].number).toBe('09');
    expect(designs[9].number).toBe('10');
    expect(designs[99].number).toBe('100');
  });
});
