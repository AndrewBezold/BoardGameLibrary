/** Parses a typed count. Blank is unknown (null). Anything other than digits becomes NaN, which fails validation. */
export function parseCount(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  return /^\d+$/.test(trimmed) ? Number(trimmed) : NaN;
}

/** True for whole numbers above zero, the only valid counts. */
export function isPositiveCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 1;
}
