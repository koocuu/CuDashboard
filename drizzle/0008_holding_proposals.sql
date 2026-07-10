CREATE TABLE IF NOT EXISTS "holding_proposals" (
  "id" serial PRIMARY KEY NOT NULL,
  "snapshot" jsonb NOT NULL,
  "summary" text DEFAULT '' NOT NULL,
  "source" text DEFAULT 'mcp' NOT NULL,
  "source_name" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "holding_proposals_status_idx" ON "holding_proposals" USING btree ("status");
