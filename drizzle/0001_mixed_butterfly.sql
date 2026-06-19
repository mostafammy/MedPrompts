ALTER TABLE `prompt_templates` ADD `is_interactive` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `prompt_templates` ADD `required_variables` text DEFAULT '[]' NOT NULL;