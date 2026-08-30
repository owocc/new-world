DROP INDEX `ai_memories_character_idx`;--> statement-breakpoint
ALTER TABLE `ai_memories` ADD `strength` real DEFAULT 0.6 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_memories` ADD `confidence` real DEFAULT 0.8 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_memories` ADD `emotional_weight` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_memories` ADD `reinforcement_count` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_memories` ADD `source_type` text DEFAULT 'dm' NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_memories` ADD `source_id` text;--> statement-breakpoint
ALTER TABLE `ai_memories` ADD `last_reinforced_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_memories` ADD `updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL;--> statement-breakpoint
CREATE INDEX `ai_memories_user_idx` ON `ai_memories` (`user_id`);--> statement-breakpoint
CREATE INDEX `ai_memories_character_idx` ON `ai_memories` (`character_id`,`strength`,`last_reinforced_at`);--> statement-breakpoint
ALTER TABLE `ai_characters` ADD `memory_retention` text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_characters` ADD `grudge_rate` real DEFAULT 0.3 NOT NULL;