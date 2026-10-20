/** Display numbers describe the current visible order, never a database identity. */
export function numberDesigns<T extends object>(orderedDesigns: readonly T[]): Array<T & { number: string }> {
  return orderedDesigns.map((design, index) => ({
    ...design,
    number: String(index + 1).padStart(2, '0'),
  }));
}
