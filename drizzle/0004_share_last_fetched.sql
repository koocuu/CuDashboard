ALTER TABLE "api_tokens" ADD COLUMN IF NOT EXISTS "last_fetched_at" timestamp with time zone;
