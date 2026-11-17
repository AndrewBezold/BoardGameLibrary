import { sql } from 'drizzle-orm';

import { db } from './client';
import { live } from './live';
import { useLiveRows } from './live-query';
import { plays } from './schema';

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
