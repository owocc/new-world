CREATE TABLE `conversation_turns` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`user_id` text NOT NULL,
	`character_id` text NOT NULL,
	`status` text DEFAULT 'collecting' NOT NULL,
	`scheduled_for` integer NOT NULL,
	`collect_deadline` integer NOT NULL,
	`generation_id` text,
	`lease_expires_at` integer,
	`locked_by` text,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`error` text,
	`completed_at` integer,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `ai_characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `conversation_turns_conv_status_idx` ON `conversation_turns` (`conversation_id`,`status`);--> statement-breakpoint
CREATE INDEX `conversation_turns_scheduled_idx` ON `conversation_turns` (`status`,`scheduled_for`);--> statement-breakpoint
CREATE INDEX `conversation_turns_lease_idx` ON `conversation_turns` (`status`,`lease_expires_at`);--> statement-breakpoint
ALTER TABLE `messages` ADD `turn_id` text REFERENCES conversation_turns(id);--> statement-breakpoint
CREATE INDEX `messages_turn_idx` ON `messages` (`turn_id`);