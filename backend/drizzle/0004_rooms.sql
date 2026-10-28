CREATE TYPE "public"."room_kind" AS ENUM('guided', 'peer');--> statement-breakpoint
CREATE TABLE "room_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"author_id" uuid NOT NULL,
	"text" text NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	"held_reasons" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_presence" (
	"room_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_presence_room_id_account_id_pk" PRIMARY KEY("room_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "room_kind" NOT NULL,
	"community_id" text NOT NULL,
	"host_id" uuid,
	"schedule_day" smallint,
	"schedule_time" text,
	"duration_min" smallint DEFAULT 60 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "room_message_id" text;--> statement-breakpoint
ALTER TABLE "room_messages" ADD CONSTRAINT "room_messages_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_messages" ADD CONSTRAINT "room_messages_author_id_accounts_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_presence" ADD CONSTRAINT "room_presence_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_presence" ADD CONSTRAINT "room_presence_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_host_id_accounts_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "room_messages_room_idx" ON "room_messages" USING btree ("room_id","created_at");--> statement-breakpoint
CREATE INDEX "room_messages_author_idx" ON "room_messages" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "room_messages_status_idx" ON "room_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "room_presence_seen_idx" ON "room_presence" USING btree ("room_id","seen_at");--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_room_message_id_room_messages_id_fk" FOREIGN KEY ("room_message_id") REFERENCES "public"."room_messages"("id") ON DELETE cascade ON UPDATE no action;