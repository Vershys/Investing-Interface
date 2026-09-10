CREATE TABLE `agent_budget` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`reserved` integer DEFAULT 0 NOT NULL,
	`calls` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `day`)
);
--> statement-breakpoint
CREATE TABLE `agent_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`thread_id` text NOT NULL,
	`ticker` text NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`status` text NOT NULL,
	`manifest` text NOT NULL,
	`actions` text NOT NULL,
	`checkpoint` text NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`cached_tokens` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`model` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `runs_thread` ON `agent_runs` (`user_id`,`thread_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `runs_user_date` ON `agent_runs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `memory_records` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`version` integer NOT NULL,
	`kind` text NOT NULL,
	`ticker` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`status` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	`actor` text NOT NULL,
	PRIMARY KEY(`user_id`, `id`, `version`)
);
--> statement-breakpoint
CREATE INDEX `memory_scope` ON `memory_records` (`user_id`,`ticker`,`kind`);--> statement-breakpoint
CREATE INDEX `memory_created` ON `memory_records` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `monitor_checks` (
	`user_id` text PRIMARY KEY NOT NULL,
	`checked_at` text NOT NULL,
	`status` text NOT NULL,
	`detail` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `monitor_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`rule_id` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`ticker` text NOT NULL,
	`body` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `monitor_dedupe` ON `monitor_events` (`user_id`,`dedupe_key`);--> statement-breakpoint
CREATE INDEX `monitor_user_time` ON `monitor_events` (`user_id`,`created_at`);