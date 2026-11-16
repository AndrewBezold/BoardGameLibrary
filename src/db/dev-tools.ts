import { db } from './client';
import { useReloadDeviceUser } from './current-user';
import { ensureDeviceUser } from './device-user';
import { seedFixture } from './fixture';
import { appMeta, games, people, personGames, playPlayers, plays } from './schema';

/** Deletes every row. The schema is kept. */
function wipeDatabase() {
  db.transaction((tx) => {
    tx.delete(playPlayers).run();
    tx.delete(plays).run();
    tx.delete(personGames).run();
    tx.delete(games).run();
    tx.delete(people).run();
    tx.delete(appMeta).run();
  });
}

/** Dev only: actions for the Developer section of Settings. */
export function useDevTools() {
  const reloadDeviceUser = useReloadDeviceUser();
  return {
    /** Wipes all data and starts over as on first launch. */
    resetDatabase() {
      wipeDatabase();
      reloadDeviceUser();
    },
    /** Wipes all data, then fills it with the sample data in fixture.ts. */
    loadSampleData() {
      wipeDatabase();
      seedFixture(ensureDeviceUser().id);
      reloadDeviceUser();
    },
  };
}
