ALTER TABLE "work_items" ADD COLUMN IF NOT EXISTS "category" text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_items_category_idx" ON "work_items" USING btree ("category");
