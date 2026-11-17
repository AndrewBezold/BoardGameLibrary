// Type-only import: erased at build time, so this module never loads the database.
import type { EditableGame } from '@/db/games';

type FilterableGame = Pick<EditableGame, 'minPlayers' | 'maxPlayers' | 'playTimeMinutes'> & {
  owners: readonly { id: string }[];
};

/** What to filter games by. Null means that filter isn't set. */
export type GameFilter = {
  players: number | null;
  maxMinutes: number | null;
  /** Only games at least one of these people owns (e.g. tonight's people). */
  ownedByAnyOf: ReadonlySet<string> | null;
};

/**
 * How a game matches the filter. `unknown` means it isn't ruled out, but a
 * detail needed to judge a filter that's set is missing. Only the filters that
 * are set are judged, so with none set every game fits.
 */
export type Fit = 'fits' | 'unknown' | 'no';

export function gameFit(game: FilterableGame, { players, maxMinutes, ownedByAnyOf }: GameFilter): Fit {
  if (ownedByAnyOf && !game.owners.some((owner) => ownedByAnyOf.has(owner.id))) return 'no';

  let unknown = false;

  if (players !== null) {
    const { minPlayers, maxPlayers } = game;
    if (minPlayers !== null && players < minPlayers) return 'no';
    if (maxPlayers !== null && players > maxPlayers) return 'no';
    if (minPlayers === null || maxPlayers === null) unknown = true;
  }

  if (maxMinutes !== null) {
    const time = game.playTimeMinutes;
    if (time !== null && time > maxMinutes) return 'no';
    if (time === null) unknown = true;
  }

  return unknown ? 'unknown' : 'fits';
}

/**
 * The details a game is missing for the filters that are set, e.g.
 * ["min players", "play time"]. Explains why a game's fit is `unknown`.
 */
export function missingDetails(game: FilterableGame, { players, maxMinutes }: GameFilter): string[] {
  const missing: string[] = [];
  if (players !== null) {
    if (game.minPlayers === null) missing.push('min players');
    if (game.maxPlayers === null) missing.push('max players');
  }
  if (maxMinutes !== null && game.playTimeMinutes === null) missing.push('play time');
  return missing;
}

/**
 * Never-played games first, then the longest since last played. Ties keep
 * their order (name). `lastPlayedOn` gives a game's `YYYY-MM-DD`, or null if never played.
 */
export function leastRecentlyPlayedFirst<T extends { id: string }>(
  games: readonly T[],
  lastPlayedOn: (id: string) => string | null
): T[] {
  const rank = (game: T) => lastPlayedOn(game.id) ?? '';
  // '' sorts before any date, and YYYY-MM-DD strings sort by date.
  return [...games].sort((a, b) => (rank(a) < rank(b) ? -1 : rank(a) > rank(b) ? 1 : 0));
}
