CREATE TABLE `transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`message_id` text,
	`currency` text DEFAULT 'nw' NOT NULL,
	`amount` integer NOT NULL,
	`note` text,
	`sender_type` text NOT NULL,
	`sender_character_id` text,
	`recipient_type` text NOT NULL,
	`recipient_character_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer,
	`claimed_at` integer,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `transfers_user_idx` ON `transfers` (`user_id`);--> statement-breakpoint
CREATE INDEX `transfers_status_idx` ON `transfers` (`status`,`expires_at`);