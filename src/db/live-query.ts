import { getTableConfig, type SQLiteTable } from 'drizzle-orm/sqlite-core';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useState, useSyncExternalStore } from 'react';

/**
 * Runs `read` now and again whenever any of `tables` changes. Unlike drizzle's
 * useLiveQuery, which only watches the FROM table, list every table a join
 * touches. `read` must be synchronous (`.all()` / `.get()`). Pass a `key`
 * made of the query's parameters (e.g. an id): changing it re-runs the query.
 */
export function useLiveRows<T>(read: () => T, tables: SQLiteTable[], key = ''): T {
  const [state, setState] = useState(() => ({ key, store: createStore(read, tables) }));
  let { store } = state;
  if (state.key !== key) {
    // Parameters changed: start a new store now rather than after an effect.
    store = createStore(read, tables);
    setState({ key, store });
  }
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

function createStore<T>(read: () => T, tables: SQLiteTable[]) {
  let snapshot = read();
  const names = new Set(tables.map((table) => getTableConfig(table).name));

  return {
    getSnapshot: () => snapshot,
    subscribe(onChange: () => void) {
      // The change hook fires once per row, so coalesce a transaction's events into one read.
      let pending: ReturnType<typeof setTimeout> | null = null;
      const subscription = addDatabaseChangeListener(({ tableName }) => {
        if (!names.has(tableName) || pending) return;
        pending = setTimeout(() => {
          pending = null;
          snapshot = read();
          onChange();
        }, 0);
      });
      return () => {
        subscription.remove();
        if (pending) clearTimeout(pending);
      };
    },
  };
}
