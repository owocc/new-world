ALTER TABLE `image_perceptions` ADD `profile` text DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE `image_perceptions` ADD `system_prompt_used` text;--> statement-breakpoint
ALTER TABLE `image_perceptions` ADD `prompt_used` text;--> statement-breakpoint
ALTER TABLE `image_perceptions` ADD `edited_by_user` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `media_assets` ADD `content_hash` text;--> statement-breakpoint
ALTER TABLE `media_assets` ADD `image_type` text DEFAULT 'general' NOT NULL;--> statement-breakpoint
CREATE INDEX `media_assets_hash_idx` ON `media_assets` (`content_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `media_assets_hash_type_unique_idx` ON `media_assets` (`user_id`,`content_hash`,`image_type`);