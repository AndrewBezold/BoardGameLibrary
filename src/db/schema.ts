import { relations, sql } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Timestamps are ISO 8601 UTC with milliseconds (`2026-11-15T10:04:05.123Z`),
 * the format of both `new Date().toISOString()` and this SQL default, so they
 * sort as text and are precise enough for last-write-wins sync.
 */
const nowSql = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

const createdAt = () => text('created_at').notNull().default(nowSql);

/** Set automatically on `db.update()`. Not on upserts: set it there explicitly. */
const updatedAt = () =>
  text('updated_at')
    .notNull()
    .default(nowSql)
    .$onUpdate(() => new Date().toISOString());

/** Soft delete: set instead of removing the row. Every read filters with `live()`. */
const deletedAt = () => text('deleted_at');

/**
 * UUID primary key, so ids stay unique if libraries ever sync between phones.
 * Callers pass `newId()` from ./ids: generating it here would pull expo-crypto
 * into drizzle-kit, which loads this file in Node.
 */
const id = () => text('id').primaryKey();

/** Everyone in the group, including the device user (see device-user.ts). */
export const people = sqliteTable('person', {
  id: id(),
  name: text('name').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: deletedAt(),
});

export const games = sqliteTable('game', {
  id: id(),
  name: text('name').notNull(),
  // Optional details: a name is always enough. Null means unknown.
  minPlayers: integer('min_players'),
  maxPlayers: integer('max_players'),
  playTimeMinutes: integer('play_time_minutes'),
  /** BoardGameGeek thing id, for lookup and sync later. */
  bggId: integer('bgg_id'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: deletedAt(),
});

export const personGames = sqliteTable(
  'person_game',
  {
    personId: text('person_id')
      .notNull()
      .references(() => people.id, { onDelete: 'cascade' }),
    gameId: text('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [primaryKey({ columns: [t.personId, t.gameId] })]
);

/**
 * One logged play of a game. Deleting a game or person soft-deletes only that
 * row, so plays keep their history: show deleted games and people by name in
 * the play log rather than filtering them out.
 */
export const plays = sqliteTable(
  'play',
  {
    id: id(),
    gameId: text('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    /** Local calendar date the game was played, `YYYY-MM-DD` (a day, not a moment). */
    playedOn: text('played_on').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  // For per-game last played date and play count.
  (t) => [index('play_game_id_idx').on(t.gameId)]
);

/** Who played in a play. Any number of winners, including none (co-op loss). */
export const playPlayers = sqliteTable(
  'play_player',
  {
    playId: text('play_id')
      .notNull()
      .references(() => plays.id, { onDelete: 'cascade' }),
    personId: text('person_id')
      .notNull()
      .references(() => people.id, { onDelete: 'cascade' }),
    isWinner: integer('is_winner', { mode: 'boolean' }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.playId, t.personId] }),
    index('play_player_person_id_idx').on(t.personId),
  ]
);

/**
 * Small key/value store for app-level settings, e.g. which person is the device user.
 * Local config, never soft-deleted, so no `deletedAt`.
 */
export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: updatedAt(),
});

export const peopleRelations = relations(people, ({ many }) => ({
  personGames: many(personGames),
  playPlayers: many(playPlayers),
}));

export const gamesRelations = relations(games, ({ many }) => ({
  personGames: many(personGames),
  plays: many(plays),
}));

export const personGamesRelations = relations(personGames, ({ one }) => ({
  person: one(people, { fields: [personGames.personId], references: [people.id] }),
  game: one(games, { fields: [personGames.gameId], references: [games.id] }),
}));

export const playsRelations = relations(plays, ({ one, many }) => ({
  game: one(games, { fields: [plays.gameId], references: [games.id] }),
  players: many(playPlayers),
}));

export const playPlayersRelations = relations(playPlayers, ({ one }) => ({
  play: one(plays, { fields: [playPlayers.playId], references: [plays.id] }),
  person: one(people, { fields: [playPlayers.personId], references: [people.id] }),
}));

export type Person = typeof people.$inferSelect;
export type Game = typeof games.$inferSelect;
export type Play = typeof plays.$inferSelect;
export type PlayPlayer = typeof playPlayers.$inferSelect;
