// Type-only import: erased at build time, so this module never loads the database.
import type { EditableGame } from '@/db/games';

type GameDetails = Pick<EditableGame, 'minPlayers' | 'maxPlayers' | 'playTimeMinutes'>;

/** What the picker is asked for. Null means that filter isn't set. */
export type PickerFilter = {
  players: number | null;
  maxMinutes: number | null;
};

/**
 * How a game matches the filter. `unknown` means it isn't ruled out, but a
 * detail needed to judge a filter that's set is missing. Only the filters that
 * are set are judged, so with none set every game fits.
 */
export type Fit = 'fits' | 'unknown' | 'no';

export function gameFit(game: GameDetails, { players, maxMinutes }: PickerFilter): Fit {
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
