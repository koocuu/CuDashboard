CREATE TABLE IF NOT EXISTS "work_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"external_blocker" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"done_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_items_status_idx" ON "work_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_items_sort_idx" ON "work_items" USING btree ("sort_order");