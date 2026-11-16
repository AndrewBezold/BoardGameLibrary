import { isNull } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';

/** Filter for rows that haven't been soft-deleted. Use on every read of a table with `deletedAt`. */
export function live(table: { deletedAt: SQLiteColumn }) {
  return isNull(table.deletedAt);
}

/** Current time in the schema's timestamp format, for `deletedAt` and upserts. */
export function now(): string {
  return new Date().toISOString();
}
