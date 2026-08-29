CREATE TABLE `image_perceptions` (
	`id` text PRIMARY KEY NOT NULL,
	`media_asset_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`provider_type` text,
	`model` text,
	`summary` text,
	`perception` text,
	`ocr_text` text,
	`error_message` text,
	`usage_id` text,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`total_tokens` integer DEFAULT 0 NOT NULL,
	`cost_usd` real,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`analyzed_at` integer,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`media_asset_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `image_perceptions_asset_idx` ON `image_perceptions` (`media_asset_id`);--> statement-breakpoint
CREATE INDEX `image_perceptions_user_idx` ON `image_perceptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `image_perceptions_status_created_idx` ON `image_perceptions` (`status`,`created_at`);