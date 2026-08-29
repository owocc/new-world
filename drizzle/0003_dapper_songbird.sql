CREATE TABLE `group_message_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`group_message_id` text NOT NULL,
	`media_asset_id` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`group_message_id`) REFERENCES `group_messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_asset_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `group_message_attachments_msg_idx` ON `group_message_attachments` (`group_message_id`);--> statement-breakpoint
CREATE INDEX `group_message_attachments_asset_idx` ON `group_message_attachments` (`media_asset_id`);--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`media_type` text DEFAULT 'image' NOT NULL,
	`blob_url` text NOT NULL,
	`pathname` text NOT NULL,
	`download_url` text,
	`mime_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`original_filename` text,
	`width` integer,
	`height` integer,
	`duration` real,
	`status` text DEFAULT 'ready' NOT NULL,
	`purpose` text DEFAULT 'attachment' NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `media_assets_user_idx` ON `media_assets` (`user_id`);--> statement-breakpoint
CREATE INDEX `media_assets_status_created_idx` ON `media_assets` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `media_assets_pathname_idx` ON `media_assets` (`pathname`);--> statement-breakpoint
CREATE TABLE `message_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`media_asset_id` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_asset_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `message_attachments_msg_idx` ON `message_attachments` (`message_id`);--> statement-breakpoint
CREATE INDEX `message_attachments_asset_idx` ON `message_attachments` (`media_asset_id`);