import { eq } from 'drizzle-orm';
import { createContext, Fragment, use, useState, type ReactNode } from 'react';

import { db } from './client';
import { ensureDeviceUser } from './device-user';
import { useLiveRows } from './live-query';
import { people, type Person } from './schema';

type CurrentUserContextValue = {
  user: Person;
  reloadDeviceUser: () => void;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

/** Must render after migrations have run. Resolves the device user synchronously. */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [deviceUser, setDeviceUser] = useState(ensureDeviceUser);

  // Live so that renames show up everywhere immediately.
  const live = useLiveRows(
    () => db.select().from(people).where(eq(people.id, deviceUser.id)).get(),
    [people],
    deviceUser.id
  );
  const user = live?.id === deviceUser.id ? live : deviceUser;

  function reloadDeviceUser() {
    setDeviceUser(ensureDeviceUser());
  }

  return (
    <CurrentUserContext value={{ user, reloadDeviceUser }}>
      {/* Remount everything when the device user changes so no screen holds stale ids. */}
      <Fragment key={deviceUser.id}>{children}</Fragment>
    </CurrentUserContext>
  );
}

function useCurrentUserContext() {
  const ctx = use(CurrentUserContext);
  if (!ctx) throw new Error('useCurrentUser must be used inside CurrentUserProvider');
  return ctx;
}

/** The user who owns this phone. The app always acts as this user. */
export function useCurrentUser(): Person {
  return useCurrentUserContext().user;
}

/**
 * Looks up the device user again (creating one if the database no longer has
 * it) and remounts the app if it changed. Call after replacing the database's
 * contents, e.g. from the developer tools.
 */
export function useReloadDeviceUser() {
  return useCurrentUserContext().reloadDeviceUser;
}
