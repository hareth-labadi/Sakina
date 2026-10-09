CREATE TYPE "public"."account_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."recovery_type" AS ENUM('code', 'email');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('member', 'therapist', 'moderator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."token_purpose" AS ENUM('password_reset', 'email_verify');--> statement-breakpoint
CREATE TABLE "account_communities" (
	"account_id" uuid NOT NULL,
	"community_id" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_communities_account_id_community_id_pk" PRIMARY KEY("account_id","community_id")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nickname" text NOT NULL,
	"nickname_key" text NOT NULL,
	"password_hash" text NOT NULL,
	"avatar" smallint NOT NULL,
	"role" "role" DEFAULT 'member' NOT NULL,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"suspended_reason" text,
	"age_range" text,
	"country" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_nickname_key_unique" UNIQUE("nickname_key")
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"key" text PRIMARY KEY NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recovery" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"type" "recovery_type" NOT NULL,
	"code_hash" text,
	"email_encrypted" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id_hash" text PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"persistent" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"purpose" "token_purpose" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_communities" ADD CONSTRAINT "account_communities_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery" ADD CONSTRAINT "recovery_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_account_idx" ON "sessions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "tokens_account_idx" ON "tokens" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "tokens_expires_idx" ON "tokens" USING btree ("expires_at");