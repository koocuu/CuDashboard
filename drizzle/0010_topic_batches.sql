CREATE TABLE IF NOT EXISTS "topic_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"day" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"content_md" text DEFAULT '' NOT NULL,
	"candidates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_name" text DEFAULT 'topic-radar' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "topic_batches_day_idx" ON "topic_batches" USING btree ("day");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "topic_batches_created_at_idx" ON "topic_batches" USING btree ("created_at");
