import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { useMemo } from 'react';

import { db } from './client';
import { UserError } from './errors';
import type { Undo } from './games';
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

/**
 * Logs a play. People deleted since the form opened are dropped, and winners
 * who aren't players are ignored. Returns an undo that removes the play again.
 */
export function logPlay(play: NewPlay): Undo {
  const playId = db.transaction((tx) => {
    const game = tx
      .select({ id: games.id })
      .from(games)
      .where(and(eq(games.id, play.gameId), live(games)))
      .get();
    if (!game) throw new UserError('This game was deleted.');

    const playerIds =
      play.playerIds.length === 0
        ? []
        : tx
            .select({ id: people.id })
            .from(people)
            .where(and(inArray(people.id, [...play.playerIds]), live(people)))
            .all()
            .map((row) => row.id);
    if (playerIds.length === 0) throw new UserError('Pick at least one player.');

    const id = newId();
    tx.insert(plays).values({ id, gameId: game.id, playedOn: play.playedOn }).run();
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
    const time = now();
    db.transaction((tx) => {
      tx.update(plays).set({ deletedAt: time }).where(eq(plays.id, playId)).run();
      tx.update(playPlayers).set({ deletedAt: time }).where(eq(playPlayers.playId, playId)).run();
    });
  };
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
