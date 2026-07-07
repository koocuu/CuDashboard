ALTER TABLE "work_items" ADD COLUMN IF NOT EXISTS "pinned" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "work_items" SET "status" = 'inbox' WHERE "status" = 'scheduled' AND "created_at" = "updated_at";
--> statement-breakpoint
ALTER TABLE "work_items" ALTER COLUMN "status" SET DEFAULT 'inbox';
--> statement-breakpoint
ALTER TABLE "work_items" DROP COLUMN IF EXISTS "external_blocker";
--> statement-breakpoint
DROP TABLE IF EXISTS "trades";
--> statement-breakpoint
DROP TABLE IF EXISTS "ideas";
--> statement-breakpoint
DROP TABLE IF EXISTS "topics";
--> statement-breakpoint
DROP TABLE IF EXISTS "lore_cards";
--> statement-breakpoint
DROP TABLE IF EXISTS "workouts";
--> statement-breakpoint
DROP TABLE IF EXISTS "decisions";
