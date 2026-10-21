export interface WaitlistPayload { instagram: string; email: string; idea: string; placement: string; size: string }
export function validateWaitlist(input: unknown): WaitlistPayload {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid form.');
  const value = input as Record<string, unknown>;
  const read = (key: string, maximum: number, required = true) => {
    if (value[key] !== undefined && typeof value[key] !== 'string') throw new Error('invalid form.');
    const field = ((value[key] ?? '') as string).trim();
    if ((required && !field) || field.length > maximum || field.includes('\0')) throw new Error('please check the form fields.');
    return field;
  };
  const instagram = read('instagram', 100); const email = read('email', 254).toLowerCase();
  if (!/^@?[a-zA-Z0-9._]{1,30}$/.test(instagram)) throw new Error('please enter your instagram nickname.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('please enter a valid email.');
  return { instagram, email, idea: read('idea', 3000), placement: read('placement', 100, false), size: read('size', 100, false) };
}
