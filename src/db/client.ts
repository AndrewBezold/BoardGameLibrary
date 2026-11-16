import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

// enableChangeListener is required for drizzle's useLiveQuery to re-run on writes.
const expoDb = openDatabaseSync('boardgamelibrary.db', { enableChangeListener: true });
expoDb.execSync('PRAGMA foreign_keys = ON');

export const db = drizzle(expoDb, { schema });
