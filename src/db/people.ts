import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import { db } from './client';
import { newId } from './ids';
import { live, now } from './live';
import { useLiveRows } from './live-query';
import { restoreGames, type Undo } from './games';
import { games, personGames, people, type Person } from './schema';
import { assertNameFree, findLiveByName, type Reader } from './unique-names';

export type { Person };

/** Everyone in the group, sorted by name. Live. */
export function usePeople(): Person[] {
  return useLiveRows(
    () => db.select().from(people).where(live(people)).orderBy(asc(people.name)).all(),
    [people]
  );
}

export function addPerson(name: string) {
  return db.transaction((tx) => {
    assertNameFree(tx, 'person', name);
    return tx.insert(people).values({ id: newId(), name }).returning().get();
  });
}

/** The person with this name (ignoring case and spacing), added first if there isn't one. */
export function findOrAddPerson(name: string): { id: string; name: string } {
  return db.transaction((tx) => {
    const existing = findLiveByName(tx, 'person', name);
    if (existing) return existing;
    return tx
      .insert(people)
      .values({ id: newId(), name })
      .returning({ id: people.id, name: people.name })
      .get();
  });
}

export function renamePerson(personId: string, name: string) {
  db.transaction((tx) => {
    assertNameFree(tx, 'person', name, personId);
    tx.update(people).set({ name }).where(eq(people.id, personId)).run();
  });
}

/** Live games that would be left with no live owners if this person were deleted. Used before and during the delete. */
function soleOwnedGameIds(tx: Reader, personId: string): string[] {
  return tx
    .select({ gameId: personGames.gameId })
    .from(personGames)
    .innerJoin(people, eq(people.id, personGames.personId))
    .innerJoin(games, eq(games.id, personGames.gameId))
    .where(and(live(personGames), live(people), live(games)))
    .groupBy(personGames.gameId)
    .having(sql`count(*) = 1 and max(${personGames.personId}) = ${personId}`)
    .all()
    .map((row) => row.gameId);
}

/** For the confirmation dialog, before deleting. */
export function countSoleOwnedGames(personId: string): number {
  return soleOwnedGameIds(db, personId).length;
}

/**
 * Soft-deletes a person. Their ownership rows are hidden with them; games only
 * they owned are deleted too, since an ownerless game would never show up anywhere.
 * Returns how many games went with them, and an undo that restores the person
 * and those games together.
 */
export function deletePerson(personId: string): { deletedGameCount: number; undo: Undo } {
  const time = now();
  const sole = db.transaction((tx) => {
    const ids = soleOwnedGameIds(tx, personId);
    if (ids.length > 0) {
      tx.update(games).set({ deletedAt: time }).where(inArray(games.id, ids)).run();
    }
    tx.update(people).set({ deletedAt: time }).where(eq(people.id, personId)).run();
    return ids;
  });
  return { deletedGameCount: sole.length, undo: () => restorePerson(personId, sole, time) };
}

/** Undo of deletePerson. Throws if a live person or game has taken a name since. */
export function restorePerson(personId: string, gameIds: string[], time: string) {
  db.transaction((tx) => {
    const person = tx
      .select({ id: people.id, name: people.name })
      .from(people)
      .where(and(eq(people.id, personId), eq(people.deletedAt, time)))
      .get();
    if (!person) return;
    assertNameFree(tx, 'person', person.name, person.id);
    tx.update(people).set({ deletedAt: null }).where(eq(people.id, personId)).run();
    restoreGames(tx, gameIds, time);
  });
}
