import { findByName } from '@/lib/names';

import type { db } from './client';
import { UserError } from './errors';
import { live } from './live';
import { games, people } from './schema';

export type Reader = Pick<typeof db, 'select'>;

/**
 * Tables whose live rows must have unique names (ignoring case and spacing, see
 * nameKey). Checked here rather than by a DB index for now; a unique index would
 * need to be partial (`WHERE deleted_at IS NULL`) so deleted names don't block new ones.
 */
const TABLES = {
  game: { table: games, taken: (name: string) => `There's already a game called ${name}.` },
  person: { table: people, taken: (name: string) => `There's already someone called ${name}.` },
};

type Kind = keyof typeof TABLES;

/** The live row of this kind whose name matches `name`, skipping `exceptId`. */
export function findLiveByName(tx: Reader, kind: Kind, name: string, exceptId?: string) {
  const { table } = TABLES[kind];
  const rows = tx.select({ id: table.id, name: table.name }).from(table).where(live(table)).all();
  return findByName(rows, name, exceptId);
}

/** Throws a UserError naming the existing row if `name` is taken by another live row. */
export function assertNameFree(tx: Reader, kind: Kind, name: string, exceptId?: string) {
  const existing = findLiveByName(tx, kind, name, exceptId);
  if (existing) throw new UserError(TABLES[kind].taken(existing.name));
}
