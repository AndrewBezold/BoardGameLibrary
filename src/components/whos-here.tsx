import { createContext, use, useState, type ReactNode } from 'react';

import { usePeople } from '@/db/people';

type WhosHere = [ids: string[], setIds: (ids: string[]) => void];

const WhosHereContext = createContext<WhosHere | null>(null);

/**
 * Remembers "Who's here?" from the Pick tab while the app is open, so logging
 * a play can start with those people. Not saved: it resets when the app closes.
 */
export function WhosHereProvider({ children }: { children: ReactNode }) {
  const state = useState<string[]>([]);
  return <WhosHereContext value={state}>{children}</WhosHereContext>;
}

/** The people picked as here tonight, minus anyone deleted since, and a setter. */
export function useWhosHere(): WhosHere {
  const ctx = use(WhosHereContext);
  if (!ctx) throw new Error('useWhosHere must be used inside WhosHereProvider');
  const [ids, setIds] = ctx;
  const people = usePeople();
  return [ids.filter((id) => people.some((person) => person.id === id)), setIds];
}
