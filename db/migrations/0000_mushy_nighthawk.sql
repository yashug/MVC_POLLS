CREATE TABLE `admins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admins_username_uq` ON `admins` (`username`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_type` text NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` integer,
	`before` text,
	`after` text,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_at_idx` ON `audit_log` (`at`);--> statement-breakpoint
CREATE TABLE `draw_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`draw_id` integer NOT NULL,
	`entry_id` integer NOT NULL,
	`rank` integer NOT NULL,
	`confirmation_status` text DEFAULT 'n/a' NOT NULL,
	`confirm_deadline_at` integer,
	`responded_at` integer,
	FOREIGN KEY (`draw_id`) REFERENCES `draws`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `draw_results_draw_rank_uq` ON `draw_results` (`draw_id`,`rank`);--> statement-breakpoint
CREATE TABLE `draws` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`slot_id` integer,
	`method` text NOT NULL,
	`seed` text NOT NULL,
	`entrant_hash` text NOT NULL,
	`entrant_snapshot` text NOT NULL,
	`ran_at` integer,
	`ran_by` text,
	`status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`slot_id`) REFERENCES `slots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`lead_villa_id` integer NOT NULL,
	`requested_slot_id` integer,
	`assigned_slot_id` integer,
	`amount_pledged` integer,
	`is_partial` integer DEFAULT false NOT NULL,
	`gotram` text,
	`family_name` text,
	`attendees_count` integer,
	`notes` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_villa_id`) REFERENCES `villas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requested_slot_id`) REFERENCES `slots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_slot_id`) REFERENCES `slots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `entries_item_idx` ON `entries` (`item_id`,`status`);--> statement-breakpoint
CREATE TABLE `entry_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`slot_key` integer DEFAULT 0 NOT NULL,
	`villa_id` integer NOT NULL,
	`role` text NOT NULL,
	`acceptance` text DEFAULT 'pending' NOT NULL,
	`responded_at` integer,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`villa_id`) REFERENCES `villas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entry_members_item_villa_slot_uq` ON `entry_members` (`item_id`,`villa_id`,`slot_key`);--> statement-breakpoint
CREATE INDEX `entry_members_villa_idx` ON `entry_members` (`villa_id`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`year` integer NOT NULL,
	`starts_on` text NOT NULL,
	`ends_on` text NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`slug` text NOT NULL,
	`kind` text NOT NULL,
	`title_en` text NOT NULL,
	`title_te` text NOT NULL,
	`blurb_en` text DEFAULT '' NOT NULL,
	`blurb_te` text DEFAULT '' NOT NULL,
	`auction_note_en` text,
	`auction_note_te` text,
	`max_group_size` integer DEFAULT 1 NOT NULL,
	`max_entries_per_villa` integer DEFAULT 1,
	`requires_acceptance` integer DEFAULT true NOT NULL,
	`entry_fee` integer DEFAULT 0 NOT NULL,
	`allow_partial` integer DEFAULT false NOT NULL,
	`collects_slot` integer DEFAULT false NOT NULL,
	`winner_count` integer DEFAULT 1 NOT NULL,
	`opens_at` integer,
	`closes_at` integer,
	`draw_at` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `items_event_slug_uq` ON `items` (`event_id`,`slug`);--> statement-breakpoint
CREATE TABLE `pattu_vastralu` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`draw_result_id` integer NOT NULL,
	`opted` integer,
	`responded_at` integer,
	`note` text,
	FOREIGN KEY (`draw_result_id`) REFERENCES `draw_results`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer NOT NULL,
	`villa_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'due' NOT NULL,
	`marked_by` text,
	`marked_at` integer,
	`note` text,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`villa_id`) REFERENCES `villas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `previous_winners` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`villa_id` integer NOT NULL,
	`item_slug` text NOT NULL,
	`year` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`villa_id`) REFERENCES `villas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_event_key_uq` ON `settings` (`event_id`,`key`);--> statement-breakpoint
CREATE TABLE `slots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`date` text NOT NULL,
	`period` text NOT NULL,
	`capacity` integer DEFAULT 5 NOT NULL,
	`adults_count` integer DEFAULT 0 NOT NULL,
	`kids_count` integer DEFAULT 0 NOT NULL,
	`is_locked` integer DEFAULT false NOT NULL,
	`lock_note_en` text,
	`lock_note_te` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `slots_item_date_period_uq` ON `slots` (`item_id`,`date`,`period`);--> statement-breakpoint
CREATE TABLE `villa_accounts` (
	`villa_id` integer PRIMARY KEY NOT NULL,
	`pin_hash` text NOT NULL,
	`claimed_by_name` text NOT NULL,
	`claimed_phone` text,
	`claimed_at` integer NOT NULL,
	`last_login_at` integer,
	`reset_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`villa_id`) REFERENCES `villas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `villas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`villa_no` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `villas_no_uq` ON `villas` (`villa_no`);