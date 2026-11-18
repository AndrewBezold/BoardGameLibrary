import { asc, eq, inArray, isNotNull } from 'drizzle-orm';

import { db } from './client';
import { restoreGames } from './games';
import { useLiveRows } from './live-query';
import { restorePerson } from './people';
import { restorePlay } from './plays';
import { games, personGames, people, playPlayers, plays } from './schema';

type NamedRow = { id: string; name: string };

export type DeletedItem =
  | { kind: 'game'; id: string; name: string; deletedAt: string }
  /** `games` were deleted with the person (they were the only owner) and come back with them. */
  | { kind: 'person'; id: string; name: string; deletedAt: string; games: NamedRow[] }
  /**
   * A play, named after its game. `players` are the ones deleted with it.
   * `gameDeleted`: the game has been deleted too, so it must be restored first.
   */
  | {
      kind: 'play';
      id: string;
      name: string;
      deletedAt: string;
      /** Local `YYYY-MM-DD`. */
      playedOn: string;
      players: NamedRow[];
      gameDeleted: boolean;
    };

function readDeletedPlays(): DeletedItem[] {
  const deleted = db
    .select({
      id: plays.id,
      name: games.name,
      deletedAt: plays.deletedAt,
      playedOn: plays.playedOn,
      gameDeletedAt: games.deletedAt,
    })
    .from(plays)
    .innerJoin(games, eq(games.id, plays.gameId))
    .where(isNotNull(plays.deletedAt))
    .all();
  if (deleted.length === 0) return [];
  const players = db
    .select({
      playId: playPlayers.playId,
      id: people.id,
      name: people.name,
      deletedAt: playPlayers.deletedAt,
    })
    .from(playPlayers)
    .innerJoin(people, eq(people.id, playPlayers.personId))
    .where(inArray(playPlayers.playId, deleted.map((play) => play.id)))
    .orderBy(asc(people.name))
    .all();

  return deleted.map((play) => ({
    kind: 'play' as const,
    id: play.id,
    name: play.name,
    deletedAt: play.deletedAt!,
    playedOn: play.playedOn,
    // Only those deleted with the play; ones removed in an earlier edit don't come back.
    players: players
      .filter((p) => p.playId === play.id && p.deletedAt === play.deletedAt)
      .map(({ id, name }) => ({ id, name })),
    gameDeleted: play.gameDeletedAt !== null,
  }));
}

function readDeleted(): DeletedItem[] {
  return [...readDeletedGamesAndPeople(), ...readDeletedPlays()].sort((a, b) =>
    b.deletedAt.localeCompare(a.deletedAt)
  );
}

function readDeletedGamesAndPeople(): DeletedItem[] {
  const deletedGames = db
    .select({ id: games.id, name: games.name, deletedAt: games.deletedAt })
    .from(games)
    .where(isNotNull(games.deletedAt))
    .all();
  const deletedPeople = db
    .select({ id: people.id, name: people.name, deletedAt: people.deletedAt })
    .from(people)
    .where(isNotNull(people.deletedAt))
    .all();
  const ownership =
    deletedGames.length === 0
      ? []
      : db
          .select({ personId: personGames.personId, gameId: personGames.gameId })
          .from(personGames)
          .where(inArray(personGames.gameId, deletedGames.map((game) => game.id)))
          .all();

  // A game deleted in the same delete as one of its owners belongs to that person's entry.
  const personItems = deletedPeople.map((person) => {
    const owned = new Set(ownership.filter((o) => o.personId === person.id).map((o) => o.gameId));
    const withThem = deletedGames.filter((g) => g.deletedAt === person.deletedAt && owned.has(g.id));
    return {
      kind: 'person' as const,
      id: person.id,
      name: person.name,
      deletedAt: person.deletedAt!,
      games: withThem.map(({ id, name }) => ({ id, name })),
    };
  });
  const grouped = new Set(personItems.flatMap((person) => person.games.map((game) => game.id)));
  const standalone = deletedGames
    .filter((game) => !grouped.has(game.id))
    .map((game) => ({ kind: 'game' as const, id: game.id, name: game.name, deletedAt: game.deletedAt! }));

  return [...personItems, ...standalone];
}

/** Soft-deleted games, people and plays, most recent first. Live. */
export function useRecentlyDeleted(): DeletedItem[] {
  return useLiveRows(readDeleted, [games, people, personGames, plays, playPlayers]);
}

/** Restores a deleted item (a person together with the games deleted with them). */
export function restoreDeleted(item: DeletedItem) {
  if (item.kind === 'game') {
    db.transaction((tx) => restoreGames(tx, [item.id], item.deletedAt));
  } else if (item.kind === 'play') {
    restorePlay(item.id, item.deletedAt);
  } else {
    restorePerson(
      item.id,
      item.games.map((game) => game.id),
      item.deletedAt
    );
  }
}
