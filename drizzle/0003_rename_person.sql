-- Hand-written (custom migration). "user" is reserved for the device user;
-- everyone in the group is a person. No table rebuild needed: with
-- legacy_alter_table off (the default), RENAME updates the foreign keys in
-- person_game, and email isn't part of any key or index, so it can be dropped.
ALTER TABLE `user` RENAME TO `person`;--> statement-breakpoint
ALTER TABLE `user_game` RENAME TO `person_game`;--> statement-breakpoint
ALTER TABLE `person_game` RENAME COLUMN `user_id` TO `person_id`;--> statement-breakpoint
ALTER TABLE `person` DROP COLUMN `email`;
