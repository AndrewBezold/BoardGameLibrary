import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { useMemo } from 'react';

import { db } from './client';
import { UserError } from './errors';
import type { Tx, Undo } from './games';
import { newId } from './ids';
import { live, now } from './live';
import { useLiveRows } from './live-query';
import { games, people, playPlayers, plays } from './schema';

export type PlayStats = {
  /** Local `YYYY-MM-DD` of the most recent play. */
  lastPlayedOn: string;
  playCount: number;
};

/** Last played date and play count for every game with at least one play. Live. */
export function usePlayStats(): ReadonlyMap<string, PlayStats> {
  const rows = useLiveRows(
    () =>
      db
        .select({
          gameId: plays.gameId,
          lastPlayedOn: sql<string>`max(${plays.playedOn})`,
          playCount: sql<number>`count(*)`,
        })
        .from(plays)
        .where(live(plays))
        .groupBy(plays.gameId)
        .all(),
    [plays]
  );
  return useMemo(() => new Map(rows.map(({ gameId, ...stats }) => [gameId, stats])), [rows]);
}

export type NewPlay = {
  gameId: string;
  /** Local `YYYY-MM-DD`. */
  playedOn: string;
  playerIds: readonly string[];
  /** Any number of the players, including none (co-op loss) or all (co-op win). */
  winnerIds: readonly string[];
};

/** Throws unless the game exists and isn't deleted. */
function assertLiveGame(tx: Tx, gameId: string) {
  const game = tx
    .select({ id: games.id })
    .from(games)
    .where(and(eq(games.id, gameId), live(games)))
    .get();
  if (!game) throw new UserError('This game was deleted.');
}

/**
 * The ids in `playerIds` that may be saved as players: live people, plus
 * anyone in `alreadyIn` (a play's current players, who stay even if deleted
 * since). Throws if none remain.
 */
function savablePlayerIds(tx: Tx, playerIds: readonly string[], alreadyIn: readonly string[] = []): string[] {
  const kept = playerIds.filter((id) => alreadyIn.includes(id));
  const others = playerIds.filter((id) => !alreadyIn.includes(id));
  const living =
    others.length === 0
      ? []
      : tx
          .select({ id: people.id })
          .from(people)
          .where(and(inArray(people.id, others), live(people)))
          .all()
          .map((row) => row.id);
  const ids = [...kept, ...living];
  if (ids.length === 0) throw new UserError('Pick at least one player.');
  return ids;
}

/**
 * Logs a play. People deleted since the form opened are dropped, and winners
 * who aren't players are ignored. Returns an undo that removes the play again.
 */
export function logPlay(play: NewPlay): Undo {
  const playId = db.transaction((tx) => {
    assertLiveGame(tx, play.gameId);
    const playerIds = savablePlayerIds(tx, play.playerIds);

    const id = newId();
    tx.insert(plays).values({ id, gameId: play.gameId, playedOn: play.playedOn }).run();
    tx.insert(playPlayers)
      .values(
        playerIds.map((personId) => ({
          playId: id,
          personId,
          isWinner: play.winnerIds.includes(personId),
        }))
      )
      .run();
    return id;
  });

  return () => {
    deletePlay(playId);
  };
}

export type PlayDetails = NewPlay & {
  /** Everyone in the play, including people deleted since, for showing them in the form. */
  players: { id: string; name: string; deleted: boolean }[];
};

/** A play as it is now, for the edit form, or null if it's been deleted. Not live. */
export function getPlay(playId: string): PlayDetails | null {
  const play = db
    .select({ gameId: plays.gameId, playedOn: plays.playedOn })
    .from(plays)
    .where(and(eq(plays.id, playId), live(plays)))
    .get();
  if (!play) return null;
  const rows = db
    .select({
      id: people.id,
      name: people.name,
      isWinner: playPlayers.isWinner,
      personDeletedAt: people.deletedAt,
    })
    .from(playPlayers)
    .innerJoin(people, eq(people.id, playPlayers.personId))
    .where(and(eq(playPlayers.playId, playId), live(playPlayers)))
    .orderBy(asc(people.name))
    .all();
  return {
    ...play,
    playerIds: rows.map((row) => row.id),
    winnerIds: rows.filter((row) => row.isWinner).map((row) => row.id),
    players: rows.map((row) => ({ id: row.id, name: row.name, deleted: row.personDeletedAt !== null })),
  };
}

/**
 * Replaces every part of a play: game, date, players and winners. Its current
 * players may stay even if they've been deleted since; new players must be
 * live. Removed players are soft-deleted, and re-adding one revives the row.
 */
export function updatePlay(playId: string, play: NewPlay) {
  db.transaction((tx) => {
    const exists = tx
      .select({ id: plays.id })
      .from(plays)
      .where(and(eq(plays.id, playId), live(plays)))
      .get();
    if (!exists) throw new UserError('This play was deleted.');
    assertLiveGame(tx, play.gameId);

    const current = tx
      .select({ personId: playPlayers.personId })
      .from(playPlayers)
      .where(and(eq(playPlayers.playId, playId), live(playPlayers)))
      .all()
      .map((row) => row.personId);
    const playerIds = savablePlayerIds(tx, play.playerIds, current);

    const time = now();
    tx.update(plays).set({ gameId: play.gameId, playedOn: play.playedOn }).where(eq(plays.id, playId)).run();

    const removed = current.filter((id) => !playerIds.includes(id));
    if (removed.length > 0) {
      tx.update(playPlayers)
        .set({ deletedAt: time })
        .where(and(eq(playPlayers.playId, playId), inArray(playPlayers.personId, removed)))
        .run();
    }
    for (const personId of playerIds) {
      const isWinner = play.winnerIds.includes(personId);
      tx.insert(playPlayers)
        .values({ playId, personId, isWinner })
        .onConflictDoUpdate({
          target: [playPlayers.playId, playPlayers.personId],
          set: { isWinner, deletedAt: null, updatedAt: time },
        })
        .run();
    }
  });
}

/** Soft-deletes a play and its players. Returns an undo that brings them back. */
export function deletePlay(playId: string): Undo {
  const time = now();
  db.transaction((tx) => {
    tx.update(plays).set({ deletedAt: time }).where(and(eq(plays.id, playId), live(plays))).run();
    tx.update(playPlayers)
      .set({ deletedAt: time })
      .where(and(eq(playPlayers.playId, playId), live(playPlayers)))
      .run();
  });
  return () => restorePlay(playId, time);
}

/**
 * Brings back a play deleted at `time`, with the players deleted along with
 * it; players removed in an earlier edit stay removed. Throws if its game has
 * been deleted since, as the play would have nowhere to show.
 */
export function restorePlay(playId: string, time: string) {
  db.transaction((tx) => {
    const play = tx
      .select({ gameName: games.name, gameDeletedAt: games.deletedAt })
      .from(plays)
      .innerJoin(games, eq(games.id, plays.gameId))
      .where(and(eq(plays.id, playId), eq(plays.deletedAt, time)))
      .get();
    if (!play) return;
    if (play.gameDeletedAt !== null) throw new UserError(`${play.gameName} is deleted. Restore it first.`);
    tx.update(plays).set({ deletedAt: null }).where(eq(plays.id, playId)).run();
    tx.update(playPlayers)
      .set({ deletedAt: null })
      .where(and(eq(playPlayers.playId, playId), eq(playPlayers.deletedAt, time)))
      .run();
  });
}

export type PlayPlayerSummary = {
  id: string;
  name: string;
  isWinner: boolean;
  /** The person has since been deleted. Still shown, so history stays whole. */
  deleted: boolean;
};

export type PlaySummary = {
  id: string;
  /** Local `YYYY-MM-DD`. */
  playedOn: string;
  /** Winners first, then by name. */
  players: PlayPlayerSummary[];
};

/** A game's plays, newest first (same day: most recently logged first). Live. */
export function useGamePlays(gameId: string): PlaySummary[] {
  const rows = useLiveRows(
    () =>
      db
        .select({
          playId: plays.id,
          playedOn: plays.playedOn,
          personId: people.id,
          name: people.name,
          isWinner: playPlayers.isWinner,
          personDeletedAt: people.deletedAt,
        })
        .from(plays)
        .innerJoin(playPlayers, and(eq(playPlayers.playId, plays.id), live(playPlayers)))
        // Deleted people are kept: the play still happened.
        .innerJoin(people, eq(people.id, playPlayers.personId))
        .where(and(eq(plays.gameId, gameId), live(plays)))
        .orderBy(
          desc(plays.playedOn),
          desc(plays.createdAt),
          asc(plays.id),
          desc(playPlayers.isWinner),
          asc(people.name)
        )
        .all(),
    [plays, playPlayers, people],
    gameId
  );

  const result: PlaySummary[] = [];
  for (const row of rows) {
    let play = result.at(-1);
    if (play?.id !== row.playId) {
      play = { id: row.playId, playedOn: row.playedOn, players: [] };
      result.push(play);
    }
    play.players.push({
      id: row.personId,
      name: row.name,
      isWinner: row.isWinner,
      deleted: row.personDeletedAt !== null,
    });
  }
  return result;
}
