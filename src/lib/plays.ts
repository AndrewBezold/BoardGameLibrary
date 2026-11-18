import { formatRelativeDay, parseLocalDate } from './format';

/**
 * "Played 5 times · last Nov 3", "Played once · last yesterday", or "Never
 * played" when there are no stats.
 */
export function formatPlayStats(
  stats: { lastPlayedOn: string; playCount: number } | undefined,
  today: Date = new Date()
): string {
  if (!stats) return 'Never played';
  const times = stats.playCount === 1 ? 'once' : `${stats.playCount} times`;
  return `Played ${times} · last ${formatRelativeDay(parseLocalDate(stats.lastPlayedOn), today)}`;
}

/** "No winner" for none, "Everyone won" when all players won, otherwise null (mark the winners instead). */
export function winnerSummary(players: readonly { isWinner: boolean }[]): string | null {
  const winners = players.filter((p) => p.isWinner).length;
  if (winners === 0) return 'No winner';
  if (winners === players.length && players.length > 1) return 'Everyone won';
  return null;
}
