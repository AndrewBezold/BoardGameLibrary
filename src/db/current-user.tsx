import { eq } from 'drizzle-orm';
import { createContext, Fragment, use, useState, type ReactNode } from 'react';

import { db } from './client';
import { createDeviceUser, getDeviceUser } from './device-user';
import { useLiveRows } from './live-query';
import { people, type Person } from './schema';

type CurrentUserContextValue = {
  user: Person;
  reloadDeviceUser: () => void;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

type Props = {
  children: ReactNode;
  /**
   * Shown instead of `children` until the device user exists (first launch, or
   * after a dev reset). `save` creates them and throws a UserError to refuse a name.
   */
  firstRun: (save: (name: string) => void) => ReactNode;
};

/** Must render after migrations have run. Resolves the device user synchronously. */
export function CurrentUserProvider({ children, firstRun }: Props) {
  const [deviceUser, setDeviceUser] = useState(getDeviceUser);

  if (!deviceUser) {
    return firstRun((name) => setDeviceUser(createDeviceUser(name)));
  }
  return (
    <SignedIn deviceUser={deviceUser} reload={() => setDeviceUser(getDeviceUser())}>
      {children}
    </SignedIn>
  );
}

function SignedIn({
  deviceUser,
  reload,
  children,
}: {
  deviceUser: Person;
  reload: () => void;
  children: ReactNode;
}) {
  // Live so that renames show up everywhere immediately.
  const live = useLiveRows(
    () => db.select().from(people).where(eq(people.id, deviceUser.id)).get(),
    [people],
    deviceUser.id
  );
  const user = live?.id === deviceUser.id ? live : deviceUser;

  return (
    <CurrentUserContext value={{ user, reloadDeviceUser: reload }}>
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
 * Looks up the device user again and remounts the app if it changed, or shows
 * the first-run screen if there's none. Call after replacing the database's
 * contents, e.g. from the developer tools.
 */
export function useReloadDeviceUser() {
  return useCurrentUserContext().reloadDeviceUser;
}
