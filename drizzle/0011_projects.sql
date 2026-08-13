CREATE TABLE IF NOT EXISTS "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'building' NOT NULL,
	"area" text DEFAULT 'personal' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"repo_url" text DEFAULT '' NOT NULL,
	"skill_ref" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "projects_slug_unique" ON "projects" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_status_idx" ON "projects" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_sort_idx" ON "projects" USING btree ("sort_order");
