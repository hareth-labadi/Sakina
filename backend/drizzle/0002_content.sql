CREATE TYPE "public"."community_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('published', 'held', 'removed');--> statement-breakpoint
CREATE TYPE "public"."mood" AS ENUM('heavy', 'low', 'okay', 'steady', 'light');--> statement-breakpoint
CREATE TYPE "public"."notification_kind" AS ENUM('reply', 'reaction', 'therapist', 'held', 'approved');--> statement-breakpoint
CREATE TYPE "public"."post_type" AS ENUM('story', 'checkin', 'win');--> statement-breakpoint
CREATE TYPE "public"."reaction" AS ENUM('relate', 'strength', 'helped', 'thanks');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('unsafe', 'harassment', 'medical', 'personal', 'spam', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."sensitivity" AS ENUM('standard', 'sensitive', 'high');--> statement-breakpoint
CREATE TYPE "public"."therapist_kind" AS ENUM('psychologist', 'psychiatrist');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('public', 'members');--> statement-breakpoint
CREATE TABLE "blocks" (
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id")
);
--> statement-breakpoint
CREATE TABLE "communities" (
	"id" text PRIMARY KEY NOT NULL,
	"sensitivity" "sensitivity" NOT NULL,
	"status" "community_status" DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
-- The curated communities (same ids as the web app's src/data/conditions.ts). Needed before memberships get their foreign key.
INSERT INTO "communities" ("id", "sensitivity") VALUES
	('depression', 'high'),
	('anxiety', 'standard'),
	('panic', 'standard'),
	('schizophrenia', 'high'),
	('bipolar', 'sensitive'),
	('ocd', 'standard'),
	('trauma', 'high'),
	('eating', 'high'),
	('adhd', 'standard'),
	('grief', 'sensitive'),
	('burnout', 'standard'),
	('loneliness', 'standard')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"story_id" text NOT NULL,
	"actor_id" uuid,
	"count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"story_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"kind" "reaction" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reactions_story_id_account_id_kind_pk" PRIMARY KEY("story_id","account_id","kind")
);
--> statement-breakpoint
CREATE TABLE "replies" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"parent_id" text,
	"author_id" uuid NOT NULL,
	"text" text NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	"held_reasons" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reply_relates" (
	"reply_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reply_relates_reply_id_account_id_pk" PRIMARY KEY("reply_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid,
	"story_id" text,
	"reply_id" text,
	"reason" "report_reason" NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "saved_stories" (
	"account_id" uuid NOT NULL,
	"story_id" text NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_stories_account_id_story_id_pk" PRIMARY KEY("account_id","story_id")
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" text PRIMARY KEY NOT NULL,
	"community_id" text NOT NULL,
	"author_id" uuid NOT NULL,
	"type" "post_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"visibility" "visibility" NOT NULL,
	"veil" text[] DEFAULT '{}'::text[] NOT NULL,
	"mood" "mood",
	"status" "content_status" DEFAULT 'published' NOT NULL,
	"held_reasons" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "therapist_kind" "therapist_kind";--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_accounts_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_accounts_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_accounts_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replies" ADD CONSTRAINT "replies_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replies" ADD CONSTRAINT "replies_parent_id_replies_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."replies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replies" ADD CONSTRAINT "replies_author_id_accounts_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_relates" ADD CONSTRAINT "reply_relates_reply_id_replies_id_fk" FOREIGN KEY ("reply_id") REFERENCES "public"."replies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_relates" ADD CONSTRAINT "reply_relates_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_accounts_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reply_id_replies_id_fk" FOREIGN KEY ("reply_id") REFERENCES "public"."replies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_stories" ADD CONSTRAINT "saved_stories_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_stories" ADD CONSTRAINT "saved_stories_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_author_id_accounts_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_account_idx" ON "notifications" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "replies_story_idx" ON "replies" USING btree ("story_id","created_at");--> statement-breakpoint
CREATE INDEX "replies_author_idx" ON "replies" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "stories_feed_idx" ON "stories" USING btree ("community_id","status","created_at");--> statement-breakpoint
CREATE INDEX "stories_author_idx" ON "stories" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "stories_status_idx" ON "stories" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "account_communities" ADD CONSTRAINT "account_communities_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE no action ON UPDATE no action;