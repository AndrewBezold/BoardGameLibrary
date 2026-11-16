import { db } from './client';
import { addGame, deleteGame, type EditableGame } from './games';
import { newId } from './ids';
import { addPerson, deletePerson } from './people';
import { playPlayers, plays } from './schema';

type FixtureGame = Partial<Omit<EditableGame, 'name'>> & {
  name: string;
  owners: string[];
};

/** `YYYY-MM-DD` for `daysAgo` days before today, in local time (as `play.playedOn` expects). */
function localDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Dev only: fills an empty database with sample people, games, deletions and
 * plays for quick manual testing. Goes through the normal data functions so the
 * rows look exactly like ones made in the app. `meId` is the device user.
 *
 * Covers: shared and sole ownership, every kind of details summary (full,
 * min only, max only, one player count, name only), a person with no games,
 * a person whose delete takes games with them, Recently deleted entries, and
 * plays with a single winner, a tie and a co-op loss.
 */
export function seedFixture(meId: string) {
  const person = (name: string) => addPerson(name).id;
  const sam = person('Sam');
  const priya = person('Priya');
  const jordan = person('Jordan'); // only owner of two games: deleting them deletes those too
  person('Lee'); // owns nothing
  const morgan = person('Morgan'); // deleted below, with their game

  const fixtureGames: FixtureGame[] = [
    { name: 'Catan', minPlayers: 3, maxPlayers: 4, playTimeMinutes: 90, owners: [meId, sam] },
    { name: 'Wingspan', minPlayers: 1, maxPlayers: 5, playTimeMinutes: 70, owners: [meId] },
    { name: 'Azul', minPlayers: 2, maxPlayers: 4, playTimeMinutes: 45, owners: [meId] },
    { name: 'Onirim', minPlayers: 1, maxPlayers: 1, playTimeMinutes: 15, owners: [meId] },
    { name: "Grandma's Trivia Game", owners: [meId] },
    { name: 'Pandemic', minPlayers: 2, maxPlayers: 4, playTimeMinutes: 45, owners: [sam, priya] },
    { name: 'Spirit Island', minPlayers: 1, maxPlayers: 4, owners: [sam] },
    { name: 'Hanabi', maxPlayers: 5, playTimeMinutes: 25, owners: [sam] },
    { name: 'Codenames', minPlayers: 4, maxPlayers: 8, playTimeMinutes: 15, owners: [priya] },
    { name: 'Dixit', minPlayers: 3, owners: [priya] },
    { name: 'Patchwork', minPlayers: 2, maxPlayers: 2, playTimeMinutes: 30, owners: [jordan] },
    { name: 'Mage Knight', minPlayers: 1, maxPlayers: 4, playTimeMinutes: 240, owners: [jordan] },
    { name: 'Monopoly', minPlayers: 2, maxPlayers: 8, playTimeMinutes: 180, owners: [meId] },
    { name: 'Ticket to Ride', minPlayers: 2, maxPlayers: 5, playTimeMinutes: 60, owners: [morgan] },
  ];

  const gameIds = new Map<string, string>();
  for (const { owners, ...game } of fixtureGames) {
    const id = addGame(
      {
        minPlayers: null,
        maxPlayers: null,
        playTimeMinutes: null,
        ...game,
      },
      owners
    );
    gameIds.set(game.name, id);
  }
  const gameId = (name: string) => gameIds.get(name)!;

  // Recently deleted: one game on its own, and a person together with their only game.
  deleteGame(gameId('Monopoly'));
  deletePerson(morgan);

  // No data functions for plays yet, so insert them directly.
  const fixturePlays = [
    { game: 'Catan', daysAgo: 3, players: [meId, sam, priya], winners: [sam] },
    { game: 'Pandemic', daysAgo: 10, players: [meId, sam, priya], winners: [] }, // co-op loss
    { game: 'Wingspan', daysAgo: 40, players: [meId, priya], winners: [meId, priya] }, // tie
    { game: 'Catan', daysAgo: 60, players: [meId, sam, jordan], winners: [meId] },
  ];
  db.transaction((tx) => {
    for (const play of fixturePlays) {
      const playId = newId();
      tx.insert(plays)
        .values({ id: playId, gameId: gameId(play.game), playedOn: localDate(play.daysAgo) })
        .run();
      tx.insert(playPlayers)
        .values(
          play.players.map((personId) => ({
            playId,
            personId,
            isWinner: play.winners.includes(personId),
          }))
        )
        .run();
    }
  });
}
