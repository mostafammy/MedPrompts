CREATE TABLE `prompt_events` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`slug` text NOT NULL,
	`copied_at` integer NOT NULL,
	`copy_method` text
);
--> statement-breakpoint
CREATE INDEX `copied_at_idx` ON `prompt_events` (`copied_at`);--> statement-breakpoint
CREATE TABLE `prompt_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`template` text NOT NULL,
	`version` integer NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`changelog` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `active_subject_idx` ON `prompt_templates` (`subject_id`,`is_active`);--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`icon` text NOT NULL,
	`sort_order` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sort_idx` ON `subjects` (`sort_order`);--> statement-breakpoint
CREATE TABLE `topics_seed` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`slug` text NOT NULL,
	`topic` text NOT NULL,
	`is_high_yield` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_subject_slug_idx` ON `topics_seed` (`subject_id`,`slug`);--> statement-breakpoint
CREATE INDEX `high_yield_idx` ON `topics_seed` (`is_high_yield`);