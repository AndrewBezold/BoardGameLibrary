import { db } from './client';
import { appMeta, games, people, personGames, playPlayers, plays } from './schema';

/** Dev only: deletes every row. Schema is kept. */
export function wipeDatabase() {
  db.transaction((tx) => {
    tx.delete(playPlayers).run();
    tx.delete(plays).run();
    tx.delete(personGames).run();
    tx.delete(games).run();
    tx.delete(people).run();
    tx.delete(appMeta).run();
  });
}
