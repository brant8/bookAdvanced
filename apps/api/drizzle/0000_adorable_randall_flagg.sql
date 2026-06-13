CREATE TYPE "public"."ai_mode" AS ENUM('manual', 'suggest');--> statement-breakpoint
CREATE TYPE "public"."chapter_source" AS ENUM('human', 'ai', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."lore_category" AS ENUM('faction', 'ability', 'history', 'glossary', 'custom');--> statement-breakpoint
CREATE TYPE "public"."milestone_status" AS ENUM('planned', 'active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."project_visibility" AS ENUM('private', 'team');--> statement-breakpoint
CREATE TYPE "public"."story_node_status" AS ENUM('planned', 'drafting', 'completed');--> statement-breakpoint
CREATE TYPE "public"."storyline_pacing" AS ENUM('slow', 'standard', 'fast', 'custom');--> statement-breakpoint
CREATE TYPE "public"."storyline_type" AS ENUM('main', 'sub');--> statement-breakpoint
CREATE TYPE "public"."world_rule_category" AS ENUM('ability', 'geography', 'society', 'time');--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"story_node_id" uuid NOT NULL,
	"chapter_number" integer NOT NULL,
	"title" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"source" "chapter_source" DEFAULT 'human' NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"target_word_count" integer,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chapters_story_node_id_unique" UNIQUE("story_node_id"),
	CONSTRAINT "chapters_number_positive" CHECK ("chapters"."chapter_number" > 0),
	CONSTRAINT "chapters_word_count_nonnegative" CHECK ("chapters"."word_count" >= 0),
	CONSTRAINT "chapters_target_word_count_positive" CHECK ("chapters"."target_word_count" is null or "chapters"."target_word_count" > 0),
	CONSTRAINT "chapters_revision_positive" CHECK ("chapters"."revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"bio_compressed" text DEFAULT '' NOT NULL,
	"appearance" text DEFAULT '' NOT NULL,
	"personality" text DEFAULT '' NOT NULL,
	"voice_samples" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lore_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"category" "lore_category" DEFAULT 'custom' NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"inject_to_ai" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_members_project_id_user_id_pk" PRIMARY KEY("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"visibility" "project_visibility" DEFAULT 'private' NOT NULL,
	"ai_mode" "ai_mode" DEFAULT 'manual' NOT NULL,
	"style_samples" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_name_not_blank" CHECK (char_length(trim("projects"."name")) > 0),
	CONSTRAINT "projects_name_max_length" CHECK (char_length("projects"."name") <= 80)
);
--> statement-breakpoint
CREATE TABLE "story_bibles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"world_rules" text DEFAULT '' NOT NULL,
	"writing_style" text DEFAULT '' NOT NULL,
	"prohibited_content" text DEFAULT '' NOT NULL,
	"character_rules" text DEFAULT '' NOT NULL,
	"plot_goals" text DEFAULT '' NOT NULL,
	"ending_direction" text DEFAULT '' NOT NULL,
	"compressed_summary" text DEFAULT '' NOT NULL,
	"compressed_hash" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_bibles_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "story_node_characters" (
	"story_node_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	CONSTRAINT "story_node_characters_story_node_id_character_id_pk" PRIMARY KEY("story_node_id","character_id")
);
--> statement-breakpoint
CREATE TABLE "story_node_lore_entries" (
	"story_node_id" uuid NOT NULL,
	"lore_entry_id" uuid NOT NULL,
	CONSTRAINT "story_node_lore_entries_story_node_id_lore_entry_id_pk" PRIMARY KEY("story_node_id","lore_entry_id")
);
--> statement-breakpoint
CREATE TABLE "story_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"storyline_id" uuid,
	"milestone_id" uuid,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"node_goal" text DEFAULT '' NOT NULL,
	"conflict" text DEFAULT '' NOT NULL,
	"required_events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer NOT NULL,
	"status" "story_node_status" DEFAULT 'planned' NOT NULL,
	"story_time_label" text DEFAULT '' NOT NULL,
	"canvas_x" real DEFAULT 0 NOT NULL,
	"canvas_y" real DEFAULT 0 NOT NULL,
	"is_key_scene" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_nodes_sort_order_nonnegative" CHECK ("story_nodes"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "storyline_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storyline_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort_order" integer NOT NULL,
	"status" "milestone_status" DEFAULT 'planned' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storyline_milestones_sort_order_nonnegative" CHECK ("storyline_milestones"."sort_order" >= 0),
	CONSTRAINT "storyline_milestones_progress_range" CHECK ("storyline_milestones"."progress" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "storylines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"type" "storyline_type" DEFAULT 'main' NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"ending_goal" text DEFAULT '' NOT NULL,
	"pacing" "storyline_pacing" DEFAULT 'standard' NOT NULL,
	"generation_constraints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"display_name" text DEFAULT '本地创作者' NOT NULL,
	"is_local" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "world_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"condition" text NOT NULL,
	"result" text NOT NULL,
	"category" "world_rule_category" NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "world_rules_priority_range" CHECK ("world_rules"."priority" between 1 and 100)
);
--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_story_node_id_story_nodes_id_fk" FOREIGN KEY ("story_node_id") REFERENCES "public"."story_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lore_entries" ADD CONSTRAINT "lore_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_bibles" ADD CONSTRAINT "story_bibles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_node_characters" ADD CONSTRAINT "story_node_characters_story_node_id_story_nodes_id_fk" FOREIGN KEY ("story_node_id") REFERENCES "public"."story_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_node_characters" ADD CONSTRAINT "story_node_characters_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_node_lore_entries" ADD CONSTRAINT "story_node_lore_entries_story_node_id_story_nodes_id_fk" FOREIGN KEY ("story_node_id") REFERENCES "public"."story_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_node_lore_entries" ADD CONSTRAINT "story_node_lore_entries_lore_entry_id_lore_entries_id_fk" FOREIGN KEY ("lore_entry_id") REFERENCES "public"."lore_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_nodes" ADD CONSTRAINT "story_nodes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_nodes" ADD CONSTRAINT "story_nodes_storyline_id_storylines_id_fk" FOREIGN KEY ("storyline_id") REFERENCES "public"."storylines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_nodes" ADD CONSTRAINT "story_nodes_milestone_id_storyline_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."storyline_milestones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyline_milestones" ADD CONSTRAINT "storyline_milestones_storyline_id_storylines_id_fk" FOREIGN KEY ("storyline_id") REFERENCES "public"."storylines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storylines" ADD CONSTRAINT "storylines_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_rules" ADD CONSTRAINT "world_rules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chapters_project_number_idx" ON "chapters" USING btree ("project_id","chapter_number");--> statement-breakpoint
CREATE INDEX "characters_project_id_idx" ON "characters" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "characters_project_name_idx" ON "characters" USING btree ("project_id","name");--> statement-breakpoint
CREATE INDEX "lore_entries_project_id_idx" ON "lore_entries" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lore_entries_project_name_idx" ON "lore_entries" USING btree ("project_id","name");--> statement-breakpoint
CREATE INDEX "project_members_user_id_idx" ON "project_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "projects_owner_id_idx" ON "projects" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "story_node_characters_character_idx" ON "story_node_characters" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "story_node_lore_entries_lore_idx" ON "story_node_lore_entries" USING btree ("lore_entry_id");--> statement-breakpoint
CREATE INDEX "story_nodes_project_id_idx" ON "story_nodes" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "story_nodes_storyline_order_idx" ON "story_nodes" USING btree ("storyline_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "storyline_milestones_order_idx" ON "storyline_milestones" USING btree ("storyline_id","sort_order");--> statement-breakpoint
CREATE INDEX "storylines_project_id_idx" ON "storylines" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "storylines_project_title_idx" ON "storylines" USING btree ("project_id","title");--> statement-breakpoint
CREATE INDEX "world_rules_project_id_idx" ON "world_rules" USING btree ("project_id");