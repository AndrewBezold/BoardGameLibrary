/**
 * Comparison key for names: case-insensitive, ignoring surrounding and repeated
 * whitespace. Done in JS because SQLite's lower() only folds ASCII letters.
 */
export function nameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** First row whose name matches `name` (see nameKey), skipping `exceptId`. */
export function findByName<T extends { id: string; name: string }>(
  rows: T[],
  name: string,
  exceptId?: string
): T | undefined {
  const key = nameKey(name);
  return rows.find((row) => row.id !== exceptId && nameKey(row.name) === key);
}
