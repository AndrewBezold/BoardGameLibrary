/** "1 game", "3 games". Only for words that take a plain "s". */
export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/** A local calendar date (`YYYY-MM-DD`) as local midnight. `new Date(ymd)` would read it as UTC. */
export function parseLocalDate(ymd: string): Date {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * "today", "yesterday", "Nov 3", or "Nov 3, 2025" for other years, in local time.
 * Takes an ISO timestamp or a Date (use parseLocalDate for `YYYY-MM-DD` days).
 */
export function formatRelativeDay(when: string | Date, today: Date = new Date()): string {
  const date = typeof when === 'string' ? new Date(when) : when;
  const days = Math.round(
    (startOfDay(today).getTime() - startOfDay(date).getTime()) / (24 * 60 * 60 * 1000)
  );
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
