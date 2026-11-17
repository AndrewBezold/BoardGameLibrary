// Type-only import: erased at build time, so this module never loads the database.
import type { EditableGame } from '@/db/games';

import { isPositiveCount } from './numbers';

type GameDetails = Pick<EditableGame, 'minPlayers' | 'maxPlayers' | 'playTimeMinutes'>;

/** Why a game's details can't be saved, or null if they're fine. Null details are unknown. */
export function gameDetailsProblem(game: GameDetails): string | null {
  const fields: [number | null, string][] = [
    [game.minPlayers, 'Min players'],
    [game.maxPlayers, 'Max players'],
    [game.playTimeMinutes, 'Play time'],
  ];
  for (const [value, label] of fields) {
    if (value !== null && !isPositiveCount(value)) {
      return `${label} must be a whole number above zero.`;
    }
  }
  const { minPlayers, maxPlayers } = game;
  if (minPlayers !== null && maxPlayers !== null && maxPlayers < minPlayers) {
    return "Max players can't be less than min players.";
  }
  return null;
}

/** Short summary for lists, e.g. "2–4 players · 45 min". Empty if nothing is known. */
export function formatGameDetails({ minPlayers, maxPlayers, playTimeMinutes }: GameDetails): string {
  const parts: string[] = [];
  const players = (n: number) => (n === 1 ? 'player' : 'players');
  if (minPlayers !== null && maxPlayers !== null) {
    parts.push(
      minPlayers === maxPlayers
        ? `${minPlayers} ${players(minPlayers)}`
        : `${minPlayers}–${maxPlayers} players`
    );
  } else if (minPlayers !== null) {
    parts.push(`${minPlayers}+ players`);
  } else if (maxPlayers !== null) {
    parts.push(`Up to ${maxPlayers} ${players(maxPlayers)}`);
  }
  if (playTimeMinutes !== null) parts.push(`${playTimeMinutes} min`);
  return parts.join(' · ');
}
