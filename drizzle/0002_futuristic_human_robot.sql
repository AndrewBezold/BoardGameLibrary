-- Hand-edited, same pattern as 0001: drizzle-kit's version selected columns the
-- old tables don't have and relied on PRAGMA foreign_keys, a no-op inside the
-- migrator's transaction. Set user_game aside, rebuild the parents while
-- nothing references them, then restore it.
-- Timestamps move from datetime('now') ('2026-11-15 10:04:05') to ISO 8601 UTC
-- with ms ('2026-11-15T10:04:05.000Z'); updated_at is backfilled from created_at.
CREATE TABLE `__old_user_game` AS SELECT * FROM `user_game`;--> statement-breakpoint
DROP TABLE `user_game`;--> statement-breakpoint
CREATE TABLE `__new_game` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
INSERT INTO `__new_game`("id", "name", "created_at", "updated_at") SELECT "id", "name", replace("created_at", ' ', 'T') || '.000Z', replace("created_at", ' ', 'T') || '.000Z' FROM `game`;--> statement-breakpoint
DROP TABLE `game`;--> statement-breakpoint
ALTER TABLE `__new_game` RENAME TO `game`;--> statement-breakpoint
CREATE TABLE `__new_user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
INSERT INTO `__new_user`("id", "name", "email", "created_at", "updated_at") SELECT "id", "name", "email", replace("created_at", ' ', 'T') || '.000Z', replace("created_at", ' ', 'T') || '.000Z' FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
CREATE TABLE `user_game` (
	`user_id` text NOT NULL,
	`game_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`deleted_at` text,
	PRIMARY KEY(`user_id`, `game_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `game`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `user_game`("user_id", "game_id", "created_at", "updated_at") SELECT "user_id", "game_id", replace("created_at", ' ', 'T') || '.000Z', replace("created_at", ' ', 'T') || '.000Z' FROM `__old_user_game`;--> statement-breakpoint
DROP TABLE `__old_user_game`;--> statement-breakpoint
CREATE TABLE `__new_app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_app_meta`("key", "value") SELECT "key", "value" FROM `app_meta`;--> statement-breakpoint
DROP TABLE `app_meta`;--> statement-breakpoint
ALTER TABLE `__new_app_meta` RENAME TO `app_meta`;
