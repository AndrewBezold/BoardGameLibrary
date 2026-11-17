// Type-only import: erased at build time, so this module never loads the database.
import type { EditableGame } from '@/db/games';

type PickerGame = Pick<EditableGame, 'minPlayers' | 'maxPlayers' | 'playTimeMinutes'> & {
  owners: readonly { id: string }[];
};

/** What the picker is asked for. Null means that filter isn't set. */
export type PickerFilter = {
  players: number | null;
  maxMinutes: number | null;
  /** Only games at least one of these people owns (tonight's people). */
  ownedByAnyOf: ReadonlySet<string> | null;
};

/**
 * How a game matches the filter. `unknown` means it isn't ruled out, but a
 * detail needed to judge a filter that's set is missing. Only the filters that
 * are set are judged, so with none set every game fits.
 */
export type Fit = 'fits' | 'unknown' | 'no';

export function gameFit(game: PickerGame, { players, maxMinutes, ownedByAnyOf }: PickerFilter): Fit {
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
export function missingDetails(game: PickerGame, { players, maxMinutes }: PickerFilter): string[] {
  const missing: string[] = [];
  if (players !== null) {
    if (game.minPlayers === null) missing.push('min players');
    if (game.maxPlayers === null) missing.push('max players');
  }
  if (maxMinutes !== null && game.playTimeMinutes === null) missing.push('play time');
  return missing;
}
