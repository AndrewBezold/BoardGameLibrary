import { and, asc, eq, inArray } from 'drizzle-orm';

import { db } from './client';
import { UserError } from './errors';
import { newId } from './ids';
import { live, now } from './live';
import { useLiveRows } from './live-query';
import { findByName } from './names';
import { games, personGames, people } from './schema';

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

export function addGame(name: string, ownerIds: string[]) {
  db.transaction((tx) => {
    assertTitleFree(tx, name);
    const owners = existingOwnerIds(tx, ownerIds);
    const game = tx.insert(games).values({ id: newId(), name }).returning({ id: games.id }).get();
    tx.insert(personGames)
      .values(owners.map((personId) => ({ personId, gameId: game.id })))
      .run();
  });
}

export type GameWithOwners = {
  id: string;
  name: string;
  owners: { id: string; name: string }[];
};

/** Every game in the group's catalog with its owners, sorted by name. Live. */
export function useGamesWithOwners(): GameWithOwners[] {
  const rows = useLiveRows(
    () =>
      db
        .select({
          id: games.id,
          name: games.name,
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
      game = { id: row.id, name: row.name, owners: [] };
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

/** Renames a game and replaces its owner set, soft-deleting removed owners. */
export function updateGame(gameId: string, name: string, ownerIds: string[]) {
  db.transaction((tx) => {
    const exists = tx
      .select({ id: games.id })
      .from(games)
      .where(and(eq(games.id, gameId), live(games)))
      .get();
    if (!exists) throw new UserError('This game was deleted.');
    assertTitleFree(tx, name, gameId);
    const owners = existingOwnerIds(tx, ownerIds);
    tx.update(games).set({ name }).where(eq(games.id, gameId)).run();

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
