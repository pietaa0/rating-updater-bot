PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ratings` (
	`guild_id` text NOT NULL,
	`leaderboard_name` text NOT NULL,
	`player_id` text NOT NULL,
	`character_id` text NOT NULL,
	`rating` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `ratings_pk` PRIMARY KEY(`guild_id`, `leaderboard_name`, `player_id`, `character_id`),
	CONSTRAINT `fk_ratings_player_id_strive_players_id_fk` FOREIGN KEY (`player_id`) REFERENCES `strive_players`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_ratings_character_id_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_ratings_guild_id_leaderboard_name_leaderboards_guild_id_name_fk` FOREIGN KEY (`guild_id`,`leaderboard_name`) REFERENCES `leaderboards`(`guild_id`,`name`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_ratings`(`guild_id`, `leaderboard_name`, `player_id`, `character_id`, `rating`, `updated_at`) SELECT `guild_id`, `leaderboard_name`, `player_id`, `character_id`, `rating`, `updated_at` FROM `ratings`;--> statement-breakpoint
DROP TABLE `ratings`;--> statement-breakpoint
ALTER TABLE `__new_ratings` RENAME TO `ratings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;