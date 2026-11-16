/**
 * An error whose message is written for the person using the app and is safe
 * to show as-is. Anything else thrown from the data layer (raw SQLite errors,
 * native module failures) gets replaced with a friendly fallback.
 */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserError';
  }
}

/** Known SQLite failures, matched against the raw message from expo-sqlite. */
const SQLITE_MESSAGES: [RegExp, string][] = [
  [/FOREIGN KEY constraint failed/i, 'Something this depends on was deleted. Please try again.'],
  [/UNIQUE constraint failed/i, 'That already exists.'],
  [/NOT NULL constraint failed/i, 'A required field is missing.'],
  [/database is locked|SQLITE_BUSY/i, 'The library is busy. Please try again.'],
  [/database or disk is full|SQLITE_FULL/i, 'Your device is out of storage space.'],
];

/**
 * Turns a caught error into a message fit for the UI. `fallback` describes the
 * action that failed, e.g. "Could not add game". Raw details are logged in dev.
 */
export function toUserMessage(error: unknown, fallback: string): string {
  if (error instanceof UserError) return error.message;

  if (__DEV__) console.warn(`${fallback}:`, error);

  const raw = error instanceof Error ? error.message : String(error);
  const match = SQLITE_MESSAGES.find(([pattern]) => pattern.test(raw));
  return match ? `${fallback}. ${match[1]}` : `${fallback}. Please try again.`;
}
