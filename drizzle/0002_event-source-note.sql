CREATE TYPE "public"."event_source" AS ENUM('website', 'bridebook', 'manual', 'other');--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "source" "event_source" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "note" text;