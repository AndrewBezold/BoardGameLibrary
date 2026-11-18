import { and, eq, inArray, sql } from 'drizzle-orm';

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
  return new Map(rows.map(({ gameId, ...stats }) => [gameId, stats]));
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
