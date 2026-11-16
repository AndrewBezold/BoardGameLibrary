import { and, eq } from 'drizzle-orm';
import * as Device from 'expo-device';

import { db } from './client';
import { newId } from './ids';
import { live } from './live';
import { appMeta, people, type Person } from './schema';

const DEVICE_USER_KEY = 'device_user_id';

function defaultName() {
  return Device.deviceName ?? Device.modelName ?? 'Me';
}

/**
 * Returns the user who owns this phone, creating them on first launch.
 * Idempotent: the id is stored in app_meta, so later launches reuse it.
 */
export function ensureDeviceUser(): Person {
  return db.transaction((tx) => {
    const meta = tx.select().from(appMeta).where(eq(appMeta.key, DEVICE_USER_KEY)).get();
    if (meta) {
      const existing = tx
        .select()
        .from(people)
        .where(and(eq(people.id, meta.value), live(people)))
        .get();
      if (existing) return existing;
    }

    const user = tx.insert(people).values({ id: newId(), name: defaultName() }).returning().get();
    tx.insert(appMeta)
      .values({ key: DEVICE_USER_KEY, value: String(user.id) })
      .onConflictDoUpdate({ target: appMeta.key, set: { value: String(user.id) } })
      .run();
    return user;
  });
}
