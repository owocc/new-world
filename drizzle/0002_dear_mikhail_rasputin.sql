CREATE TABLE `group_attention_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`group_id` text NOT NULL,
	`character_id` text NOT NULL,
	`trigger_type` text NOT NULL,
	`priority` integer DEFAULT 1 NOT NULL,
	`trigger_message_id` text,
	`scheduled_for` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`action_taken` text,
	`processed_at` integer,
	`dedupe_key` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `ai_characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `group_attention_status_idx` ON `group_attention_events` (`status`,`scheduled_for`);--> statement-breakpoint
CREATE INDEX `group_attention_group_char_idx` ON `group_attention_events` (`group_id`,`character_id`);--> statement-breakpoint
CREATE INDEX `group_attention_user_idx` ON `group_attention_events` (`user_id`);--> statement-breakpoint
CREATE TABLE `group_members` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`user_id` text NOT NULL,
	`member_type` text DEFAULT 'ai' NOT NULL,
	`character_id` text,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`last_read_message_id` text,
	`last_read_at` integer,
	`next_check_at` integer,
	`attention_level` text DEFAULT 'normal' NOT NULL,
	`is_pinned` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `ai_characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `group_members_unique_idx` ON `group_members` (`group_id`,`member_type`,`character_id`);--> statement-breakpoint
CREATE INDEX `group_members_group_idx` ON `group_members` (`group_id`);--> statement-breakpoint
CREATE INDEX `group_members_user_idx` ON `group_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `group_members_char_idx` ON `group_members` (`character_id`);--> statement-breakpoint
CREATE INDEX `group_members_next_check_idx` ON `group_members` (`next_check_at`);--> statement-breakpoint
CREATE TABLE `group_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`user_id` text NOT NULL,
	`sender_type` text NOT NULL,
	`sender_character_id` text,
	`content` text NOT NULL,
	`reply_to_message_id` text,
	`mentions` text DEFAULT '[]' NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`usage_id` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_character_id`) REFERENCES `ai_characters`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `group_messages_group_created_idx` ON `group_messages` (`group_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `group_messages_sender_idx` ON `group_messages` (`sender_character_id`);--> statement-breakpoint
CREATE TABLE `group_reactions` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`message_id` text NOT NULL,
	`user_id` text NOT NULL,
	`reactor_type` text NOT NULL,
	`character_id` text,
	`emoji` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`message_id`) REFERENCES `group_messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `ai_characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `group_reactions_msg_idx` ON `group_reactions` (`message_id`);--> statement-breakpoint
CREATE INDEX `group_reactions_group_idx` ON `group_reactions` (`group_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `group_reactions_unique_idx` ON `group_reactions` (`message_id`,`reactor_type`,`character_id`,`emoji`);--> statement-breakpoint
CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`avatar_url` text,
	`avatar_emoji` text DEFAULT '💬' NOT NULL,
	`avatar_color` text DEFAULT 'indigo' NOT NULL,
	`created_by` text DEFAULT 'user' NOT NULL,
	`last_message_at` integer,
	`last_message_preview` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `groups_user_updated_idx` ON `groups` (`user_id`,`updated_at`);