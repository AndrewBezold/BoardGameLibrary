/** "1 game", "3 games". Only for words that take a plain "s". */
export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/** "today", "yesterday", "Nov 3", or "Nov 3, 2025" for other years, in local time. */
export function formatRelativeDay(iso: string, today: Date = new Date()): string {
  const date = new Date(iso);
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
