CREATE TABLE `journal` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`ticker` text NOT NULL,
	`body` text NOT NULL,
	`decision` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `journal_user_created` ON `journal` (`user_id`,`created_at`);