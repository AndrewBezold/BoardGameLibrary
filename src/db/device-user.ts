import { and, eq } from 'drizzle-orm';

import { db } from './client';
import { UserError } from './errors';
import { newId } from './ids';
import { live } from './live';
import { appMeta, people, type Person } from './schema';
import { assertNameFree } from './unique-names';

const DEVICE_USER_KEY = 'device_user_id';

/** The user who owns this phone, or null before they've entered their name on first launch. */
export function getDeviceUser(): Person | null {
  const meta = db.select().from(appMeta).where(eq(appMeta.key, DEVICE_USER_KEY)).get();
  if (!meta) return null;
  return (
    db
      .select()
      .from(people)
      .where(and(eq(people.id, meta.value), live(people)))
      .get() ?? null
  );
}

/** Creates the user who owns this phone. Throws a UserError for a blank or taken name. */
export function createDeviceUser(name: string): Person {
  const trimmed = name.trim();
  if (!trimmed) throw new UserError('Enter your name.');
  return db.transaction((tx) => {
    assertNameFree(tx, 'person', trimmed);
    const user = tx.insert(people).values({ id: newId(), name: trimmed }).returning().get();
    tx.insert(appMeta)
      .values({ key: DEVICE_USER_KEY, value: user.id })
      .onConflictDoUpdate({ target: appMeta.key, set: { value: user.id } })
      .run();
    return user;
  });
}
