import { and, asc, eq, inArray } from 'drizzle-orm';

import { db } from './client';
import { UserError } from './errors';
import { newId } from './ids';
import { live, now } from './live';
import { useLiveRows } from './live-query';
import { findByName } from './names';
import { games, personGames, people, type Game } from './schema';

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Drops ids of people deleted since the picker loaded; throws if none remain. */
function existingOwnerIds(tx: Tx, ownerIds: string[]): string[] {
  const ids = tx
    .select({ id: people.id })
    .from(people)
    .where(and(inArray(people.id, ownerIds), live(people)))
    .all()
    .map((row) => row.id);
  if (ids.length === 0) throw new UserError('None of the selected owners exist anymore.');
  return ids;
}

function assertTitleFree(tx: Tx, name: string, exceptId?: string) {
  const all = tx.select({ id: games.id, name: games.name }).from(games).where(live(games)).all();
  const existing = findByName(all, name, exceptId);
  if (existing) throw new UserError(`There's already a game called ${existing.name}.`);
}

/** The parts of a game the user edits. Optional details are null when unknown. */
export type EditableGame = Pick<Game, 'name' | 'minPlayers' | 'maxPlayers' | 'playTimeMinutes'>;

/** Why a game's details can't be saved, or null if they're fine. */
export function gameDetailsProblem(
  game: Pick<Game, 'minPlayers' | 'maxPlayers' | 'playTimeMinutes'>
): string | null {
  const fields: [number | null, string][] = [
    [game.minPlayers, 'Min players'],
    [game.maxPlayers, 'Max players'],
    [game.playTimeMinutes, 'Play time'],
  ];
  for (const [value, label] of fields) {
    if (value !== null && (!Number.isSafeInteger(value) || value < 1)) {
      return `${label} must be a whole number above zero.`;
    }
  }
  const { minPlayers, maxPlayers } = game;
  if (minPlayers !== null && maxPlayers !== null && maxPlayers < minPlayers) {
    return "Max players can't be less than min players.";
  }
  return null;
}

/** Copies only the editable columns, so extra fields on `game` never reach the table. */
function editableColumns(game: EditableGame): EditableGame {
  const problem = gameDetailsProblem(game);
  if (problem) throw new UserError(problem);
  const { name, minPlayers, maxPlayers, playTimeMinutes } = game;
  return { name, minPlayers, maxPlayers, playTimeMinutes };
}

export function addGame(game: EditableGame, ownerIds: string[]) {
  const values = editableColumns(game);
  db.transaction((tx) => {
    assertTitleFree(tx, values.name);
    const owners = existingOwnerIds(tx, ownerIds);
    const { id } = tx
      .insert(games)
      .values({ id: newId(), ...values })
      .returning({ id: games.id })
      .get();
    tx.insert(personGames)
      .values(owners.map((personId) => ({ personId, gameId: id })))
      .run();
  });
}

export type GameWithOwners = EditableGame & {
  id: string;
  owners: { id: string; name: string }[];
};

/** Short summary for lists, e.g. "2–4 players · 45 min". Empty if nothing is known. */
export function formatGameDetails({ minPlayers, maxPlayers, playTimeMinutes }: EditableGame): string {
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

/** Every game in the group's catalog with its owners, sorted by name. Live. */
export function useGamesWithOwners(): GameWithOwners[] {
  const rows = useLiveRows(
    () =>
      db
        .select({
          id: games.id,
          name: games.name,
          minPlayers: games.minPlayers,
          maxPlayers: games.maxPlayers,
          playTimeMinutes: games.playTimeMinutes,
          ownerId: people.id,
          ownerName: people.name,
        })
        .from(games)
        .leftJoin(personGames, and(eq(personGames.gameId, games.id), live(personGames)))
        .leftJoin(people, and(eq(people.id, personGames.personId), live(people)))
        .where(live(games))
        .orderBy(asc(games.name), asc(games.id), asc(people.name))
        .all(),
    [games, personGames, people]
  );

  const result: GameWithOwners[] = [];
  for (const row of rows) {
    let game = result.at(-1);
    if (game?.id !== row.id) {
      const { ownerId: _ownerId, ownerName: _ownerName, ...fields } = row;
      game = { ...fields, owners: [] };
      result.push(game);
    }
    if (row.ownerId !== null && row.ownerName !== null) {
      game.owners.push({ id: row.ownerId, name: row.ownerName });
    }
  }
  return result;
}

/** Live owners of a game (ownership row and person both not deleted). */
function liveOwnerIds(tx: Pick<typeof db, 'select'>, gameId: string): string[] {
  return tx
    .select({ personId: personGames.personId })
    .from(personGames)
    .innerJoin(people, eq(people.id, personGames.personId))
    .where(and(eq(personGames.gameId, gameId), live(personGames), live(people)))
    .all()
    .map((row) => row.personId);
}

export function getGameOwnerIds(gameId: string): string[] {
  return liveOwnerIds(db, gameId);
}

/** Saves a game's name and details and replaces its owner set, soft-deleting removed owners. */
export function updateGame(gameId: string, game: EditableGame, ownerIds: string[]) {
  const values = editableColumns(game);
  db.transaction((tx) => {
    const exists = tx
      .select({ id: games.id })
      .from(games)
      .where(and(eq(games.id, gameId), live(games)))
      .get();
    if (!exists) throw new UserError('This game was deleted.');
    assertTitleFree(tx, values.name, gameId);
    const owners = existingOwnerIds(tx, ownerIds);
    tx.update(games).set(values).where(eq(games.id, gameId)).run();

    const current = liveOwnerIds(tx, gameId);
    const removed = current.filter((id) => !owners.includes(id));
    const added = owners.filter((id) => !current.includes(id));
    const time = now();
    if (removed.length > 0) {
      tx.update(personGames)
        .set({ deletedAt: time })
        .where(and(eq(personGames.gameId, gameId), inArray(personGames.personId, removed)))
        .run();
    }
    if (added.length > 0) {
      // Revives an ownership row that was soft-deleted earlier.
      tx.insert(personGames)
        .values(added.map((personId) => ({ personId, gameId })))
        .onConflictDoUpdate({
          target: [personGames.personId, personGames.gameId],
          set: { deletedAt: null, updatedAt: time },
        })
        .run();
    }
  });
}

/** Restores the result of a delete. */
export type Undo = () => void;

/**
 * Soft delete. Its ownership rows are hidden with it. Returns an undo that
 * clears the mark, unless the game has since been restored and deleted again.
 */
export function deleteGame(gameId: string): Undo {
  const time = now();
  db.update(games).set({ deletedAt: time }).where(eq(games.id, gameId)).run();
  return () => db.transaction((tx) => restoreGames(tx, [gameId], time));
}

/**
 * Clears `deletedAt` on games deleted at `time`. Throws if a live game has
 * taken one of their names since, or if a game would come back with no live owners.
 */
export function restoreGames(tx: Tx, gameIds: string[], time: string) {
  const deleted = tx
    .select({ id: games.id, name: games.name })
    .from(games)
    .where(and(inArray(games.id, gameIds), eq(games.deletedAt, time)))
    .all();
  if (deleted.length === 0) return;
  for (const game of deleted) {
    assertTitleFree(tx, game.name, game.id);
    if (liveOwnerIds(tx, game.id).length === 0) {
      throw new UserError(`${game.name} has no owners left. Restore one of them first.`);
    }
  }
  tx.update(games)
    .set({ deletedAt: null })
    .where(inArray(games.id, deleted.map((game) => game.id)))
    .run();
}
