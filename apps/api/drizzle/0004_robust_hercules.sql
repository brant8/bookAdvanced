CREATE TYPE "public"."ai_provider_kind" AS ENUM('text', 'image');--> statement-breakpoint
CREATE TYPE "public"."generation_status" AS ENUM('pending', 'running', 'completed', 'approved', 'rejected', 'failed');--> statement-breakpoint
CREATE TYPE "public"."story_edge_type" AS ENUM('flow', 'branch', 'parallel', 'causal', 'foreshadow', 'reveal');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner');--> statement-breakpoint
CREATE TABLE "ai_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "ai_provider_kind" NOT NULL,
	"protocol" text NOT NULL,
	"base_url" text NOT NULL,
	"default_model" text NOT NULL,
	"models" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"encrypted_api_key" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"project_id" uuid,
	"provider_id" uuid,
	"task_type" text NOT NULL,
	"status" "generation_status" DEFAULT 'pending' NOT NULL,
	"input" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"output" jsonb,
	"error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_node_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"source_node_id" uuid NOT NULL,
	"target_node_id" uuid NOT NULL,
	"type" "story_edge_type" DEFAULT 'flow' NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"condition" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_node_edges_not_self" CHECK ("story_node_edges"."source_node_id" <> "story_node_edges"."target_node_id")
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'owner' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_providers" ADD CONSTRAINT "ai_providers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_provider_id_ai_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."ai_providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_node_edges" ADD CONSTRAINT "story_node_edges_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_node_edges" ADD CONSTRAINT "story_node_edges_source_node_id_story_nodes_id_fk" FOREIGN KEY ("source_node_id") REFERENCES "public"."story_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_node_edges" ADD CONSTRAINT "story_node_edges_target_node_id_story_nodes_id_fk" FOREIGN KEY ("target_node_id") REFERENCES "public"."story_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_providers_owner_id_idx" ON "ai_providers" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_providers_owner_name_idx" ON "ai_providers" USING btree ("owner_id","name");--> statement-breakpoint
CREATE INDEX "generation_runs_owner_id_idx" ON "generation_runs" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "generation_runs_project_id_idx" ON "generation_runs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "story_node_edges_project_id_idx" ON "story_node_edges" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "story_node_edges_unique_idx" ON "story_node_edges" USING btree ("source_node_id","target_node_id","type");--> statement-breakpoint
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions" USING btree ("user_id");