CREATE TABLE IF NOT EXISTS "backup_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "backup_runs_created_at_idx" ON "backup_runs" USING btree ("created_at");
