CREATE TABLE `red_packet_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`red_packet_id` text NOT NULL,
	`claimant_key` text NOT NULL,
	`claimant_type` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`red_packet_id`) REFERENCES `red_packets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `red_packet_claims_unique_idx` ON `red_packet_claims` (`red_packet_id`,`claimant_key`);--> statement-breakpoint
CREATE TABLE `red_packets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`message_id` text,
	`currency` text DEFAULT 'nw' NOT NULL,
	`total_amount` integer NOT NULL,
	`share_count` integer DEFAULT 1 NOT NULL,
	`claimed_count` integer DEFAULT 0 NOT NULL,
	`claimed_amount` integer DEFAULT 0 NOT NULL,
	`sender_type` text NOT NULL,
	`sender_character_id` text,
	`greeting` text,
	`status` text DEFAULT 'open' NOT NULL,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `red_packets_user_idx` ON `red_packets` (`user_id`);--> statement-breakpoint
CREATE TABLE `wallet_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`owner_type` text NOT NULL,
	`character_id` text,
	`currency` text DEFAULT 'nw' NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `ai_characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `wallet_accounts_user_idx` ON `wallet_accounts` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `wallet_accounts_unique_idx` ON `wallet_accounts` (`user_id`,`owner_type`,`character_id`,`currency`);--> statement-breakpoint
CREATE TABLE `wallet_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`direction` text NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'nw' NOT NULL,
	`balance_after` integer NOT NULL,
	`counterparty_type` text,
	`counterparty_character_id` text,
	`counterparty_name` text,
	`message_id` text,
	`red_packet_id` text,
	`note` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `wallet_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `wallet_transactions_account_idx` ON `wallet_transactions` (`account_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `wallet_transactions_user_idx` ON `wallet_transactions` (`user_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `messages` ADD `type` text DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `payload` text;