CREATE TABLE `characters` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `leaderboards` (
	`guild_id` text NOT NULL,
	`name` text NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `leaderboards_pk` PRIMARY KEY(`guild_id`, `name`)
);
--> statement-breakpoint
CREATE TABLE `ratings` (
	`guild_id` text NOT NULL,
	`leaderboard_name` text NOT NULL,
	`player_id` text NOT NULL,
	`character_id` text NOT NULL,
	`rating` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `ratings_pk` PRIMARY KEY(`guild_id`, `leaderboard_name`, `player_id`, `character_id`),
	CONSTRAINT `fk_ratings_player_id_strive_players_id_fk` FOREIGN KEY (`player_id`) REFERENCES `strive_players`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_ratings_character_id_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_ratings_guild_id_leaderboard_name_leaderboards_guild_id_name_fk` FOREIGN KEY (`guild_id`,`leaderboard_name`) REFERENCES `leaderboards`(`guild_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `strive_players` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL
);
