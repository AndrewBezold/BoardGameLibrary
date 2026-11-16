import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';

import { db } from './client';
import { UserError } from './errors';
import { newId } from './ids';
import { live, now } from './live';
import { useLiveRows } from './live-query';
import { restoreGames, type Undo } from './games';
import { findByName } from './names';
import { games, personGames, people, type Person } from './schema';

export type { Person };

type Reader = Pick<typeof db, 'select'>;

/** Everyone in the group, sorted by name. Live. */
export function usePeople(): Person[] {
  return useLiveRows(
    () => db.select().from(people).where(live(people)).orderBy(asc(people.name)).all(),
    [people]
  );
}

/** Everyone except `meId`, sorted by name. Live. */
export function useOtherPeople(meId: string): Person[] {
  return useLiveRows(
    () =>
      db
        .select()
        .from(people)
        .where(and(ne(people.id, meId), live(people)))
        .orderBy(asc(people.name))
        .all(),
    [people],
    meId
  );
}

/** The person whose name matches `name` case-insensitively, if any. */
export function findPersonByName(name: string, exceptId?: string, tx: Reader = db) {
  const all = tx.select({ id: people.id, name: people.name }).from(people).where(live(people)).all();
  return findByName(all, name, exceptId);
}

function assertNameFree(tx: Reader, name: string, exceptId?: string) {
  const existing = findPersonByName(name, exceptId, tx);
  if (existing) throw new UserError(`There's already someone called ${existing.name}.`);
}

export function addPerson(name: string) {
  return db.transaction((tx) => {
    assertNameFree(tx, name);
    return tx.insert(people).values({ id: newId(), name }).returning().get();
  });
}

export function renamePerson(personId: string, name: string) {
  db.transaction((tx) => {
    assertNameFree(tx, name, personId);
    tx.update(people).set({ name }).where(eq(people.id, personId)).run();
  });
}

/** Live games that would be left with no live owners if this person were deleted. */
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

export function countSoleOwnedGames(personId: string): number {
  return soleOwnedGameIds(db, personId).length;
}

/**
 * Soft-deletes a person. Their ownership rows are hidden with them; games only
 * they owned are deleted too, since an ownerless game would never show up anywhere.
 * Returns an undo that restores the person and those games together.
 */
export function deletePerson(personId: string): Undo {
  const time = now();
  const sole = db.transaction((tx) => {
    const ids = soleOwnedGameIds(tx, personId);
    if (ids.length > 0) {
      tx.update(games).set({ deletedAt: time }).where(inArray(games.id, ids)).run();
    }
    tx.update(people).set({ deletedAt: time }).where(eq(people.id, personId)).run();
    return ids;
  });
  return () => restorePerson(personId, sole, time);
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
    assertNameFree(tx, person.name, person.id);
    tx.update(people).set({ deletedAt: null }).where(eq(people.id, personId)).run();
    restoreGames(tx, gameIds, time);
  });
}
