CREATE TABLE `template_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`semver` text NOT NULL,
	`template` text NOT NULL,
	`checksum` text NOT NULL,
	`changelog` text,
	`parent_semver` text,
	`activated_by` text NOT NULL,
	`activated_at` integer NOT NULL,
	`deactivated_at` integer,
	FOREIGN KEY (`template_id`) REFERENCES `prompt_templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `version_history_idx` ON `template_versions` (`template_id`,`activated_at`);--> statement-breakpoint
CREATE INDEX `version_parent_lookup_idx` ON `template_versions` (`template_id`,`parent_semver`);--> statement-breakpoint
DROP INDEX "copied_at_idx";--> statement-breakpoint
DROP INDEX "active_subject_idx";--> statement-breakpoint
DROP INDEX "semver_lookup_idx";--> statement-breakpoint
DROP INDEX "checksum_idx";--> statement-breakpoint
DROP INDEX "sort_idx";--> statement-breakpoint
DROP INDEX "version_history_idx";--> statement-breakpoint
DROP INDEX "version_parent_lookup_idx";--> statement-breakpoint
DROP INDEX "unique_subject_slug_idx";--> statement-breakpoint
DROP INDEX "high_yield_idx";--> statement-breakpoint
ALTER TABLE `prompt_templates` ALTER COLUMN "required_variables" TO "required_variables" text NOT NULL;--> statement-breakpoint
CREATE INDEX `copied_at_idx` ON `prompt_events` (`copied_at`);--> statement-breakpoint
CREATE INDEX `active_subject_idx` ON `prompt_templates` (`subject_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `semver_lookup_idx` ON `prompt_templates` (`subject_id`,`version_major`,`version_minor`);--> statement-breakpoint
CREATE INDEX `checksum_idx` ON `prompt_templates` (`subject_id`,`checksum`);--> statement-breakpoint
CREATE INDEX `sort_idx` ON `subjects` (`sort_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_subject_slug_idx` ON `topics_seed` (`subject_id`,`slug`);--> statement-breakpoint
CREATE INDEX `high_yield_idx` ON `topics_seed` (`is_high_yield`);--> statement-breakpoint
ALTER TABLE `prompt_templates` ADD `semver` text DEFAULT '1.0.0' NOT NULL;--> statement-breakpoint
ALTER TABLE `prompt_templates` ADD `version_major` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `prompt_templates` ADD `version_minor` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `prompt_templates` ADD `version_patch` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `prompt_templates` ADD `checksum` text DEFAULT '' NOT NULL;