CREATE TABLE IF NOT EXISTS "api_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"scope" text DEFAULT 'read' NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "decisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'deliberating' NOT NULL,
	"context_md" text DEFAULT '' NOT NULL,
	"options_md" text DEFAULT '' NOT NULL,
	"final_choice_md" text DEFAULT '' NOT NULL,
	"review_md" text DEFAULT '' NOT NULL,
	"decided_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_key" text NOT NULL,
	"type" text DEFAULT 'note' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"content_md" text DEFAULT '' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"status" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "holdings" (
	"id" serial PRIMARY KEY NOT NULL,
	"market" text NOT NULL,
	"symbol" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"position_pct" integer DEFAULT 0 NOT NULL,
	"cost_note" text DEFAULT '' NOT NULL,
	"thesis_md" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"watch_price_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ideas" (
	"id" serial PRIMARY KEY NOT NULL,
	"account" text NOT NULL,
	"content_md" text NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'pool' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lore_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"content_md" text DEFAULT '' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"related_topic_ids" integer[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profile_doc" (
	"id" serial PRIMARY KEY NOT NULL,
	"layer" text NOT NULL,
	"content_md" text DEFAULT '' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_doc_layer_unique" UNIQUE("layer")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profile_proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"layer" text NOT NULL,
	"proposed_content_md" text NOT NULL,
	"diff_summary" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'paste' NOT NULL,
	"source_name" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profile_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"layer" text NOT NULL,
	"content_md" text NOT NULL,
	"version" integer NOT NULL,
	"archived_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"account" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'idea' NOT NULL,
	"outline_md" text DEFAULT '' NOT NULL,
	"published_url" text,
	"published_at" timestamp with time zone,
	"performance_note" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"holding_id" integer,
	"action" text NOT NULL,
	"symbol" text DEFAULT '' NOT NULL,
	"market" text DEFAULT 'cn' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"motivation_md" text NOT NULL,
	"emotion_tag" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"type" text NOT NULL,
	"content_md" text DEFAULT '' NOT NULL,
	"feeling_note" text DEFAULT '' NOT NULL,
	"sleep_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entries_section_idx" ON "entries" USING btree ("section_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proposals_status_idx" ON "profile_proposals" USING btree ("status");