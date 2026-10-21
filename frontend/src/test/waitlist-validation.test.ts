import { describe, expect, it } from 'vitest';
import { validateWaitlist } from '../../../supabase/functions/_shared/validation';

const input = { instagram: ' @test.artist ', email: ' PERSON@example.com ', idea: ' design 01 ', placement: '', size: '' };
describe('server waitlist validation', () => {
  it('normalizes the input without changing the meaning of an idea', () => {
    expect(validateWaitlist(input)).toEqual({ instagram: '@test.artist', email: 'person@example.com', idea: 'design 01', placement: '', size: '' });
  });
  it.each([null, [], { ...input, email: 'missing-at' }, { ...input, idea: ' ' }, { ...input, instagram: 'not a nickname' },
    { ...input, idea: 'a'.repeat(3001) }, { ...input, placement: 42 }, { ...input, idea: 'a\0b' }])('rejects invalid or oversized input', value => {
    expect(() => validateWaitlist(value)).toThrow();
  });
});
