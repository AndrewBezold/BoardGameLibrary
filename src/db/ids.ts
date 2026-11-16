import { randomUUID } from 'expo-crypto';

/** A new primary key (UUID v4) for any table. */
export function newId(): string {
  return randomUUID();
}
