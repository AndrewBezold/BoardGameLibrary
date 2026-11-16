-- Hand-edited. drizzle-kit's version toggled PRAGMA foreign_keys, which is a
-- no-op inside the migrator's transaction, so dropping `user` would have
-- cascade-deleted every ownership row. Instead, set user_game aside, rebuild
-- the parents while nothing references them, then restore it.
-- Existing integer ids become their text form ('1', '2', ...); new rows get UUIDs.
CREATE TABLE `__old_user_game` AS SELECT * FROM `user_game`;--> statement-breakpoint
DROP TABLE `user_game`;--> statement-breakpoint
CREATE TABLE `__new_game` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_game`("id", "name", "created_at") SELECT CAST("id" AS TEXT), "name", "created_at" FROM `game`;--> statement-breakpoint
DROP TABLE `game`;--> statement-breakpoint
ALTER TABLE `__new_game` RENAME TO `game`;--> statement-breakpoint
CREATE TABLE `__new_user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_user`("id", "name", "email", "created_at") SELECT CAST("id" AS TEXT), "name", "email", "created_at" FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
CREATE TABLE `user_game` (
	`user_id` text NOT NULL,
	`game_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	PRIMARY KEY(`user_id`, `game_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `game`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `user_game`("user_id", "game_id", "created_at") SELECT CAST("user_id" AS TEXT), CAST("game_id" AS TEXT), "created_at" FROM `__old_user_game`;--> statement-breakpoint
DROP TABLE `__old_user_game`;
