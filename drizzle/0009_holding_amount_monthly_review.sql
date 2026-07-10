ALTER TABLE "holdings" ADD COLUMN IF NOT EXISTS "amount_cny" real DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "holding_proposals" ADD COLUMN IF NOT EXISTS "month" text;
--> statement-breakpoint
ALTER TABLE "holding_proposals" ADD COLUMN IF NOT EXISTS "review_data" jsonb;
