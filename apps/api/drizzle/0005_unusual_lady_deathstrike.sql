CREATE TYPE "public"."asset_kind" AS ENUM('character', 'scene', 'background', 'prop', 'reference');--> statement-breakpoint
CREATE TYPE "public"."asset_source" AS ENUM('upload', 'generated');--> statement-breakpoint
CREATE TYPE "public"."storyboard_status" AS ENUM('draft', 'ready');--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"kind" "asset_kind" DEFAULT 'reference' NOT NULL,
	"source" "asset_source" NOT NULL,
	"name" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"storage_path" text NOT NULL,
	"prompt" text DEFAULT '' NOT NULL,
	"character_id" uuid,
	"story_node_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_abilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_node_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"time_of_day" text DEFAULT '' NOT NULL,
	"weather" text DEFAULT '' NOT NULL,
	"atmosphere" text DEFAULT '' NOT NULL,
	"visual_prompt" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scenes_story_node_id_unique" UNIQUE("story_node_id")
);
--> statement-breakpoint
CREATE TABLE "storyboard_shots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storyboard_id" uuid NOT NULL,
	"story_node_id" uuid,
	"asset_id" uuid,
	"sort_order" integer NOT NULL,
	"title" text NOT NULL,
	"narration" text DEFAULT '' NOT NULL,
	"visual_prompt" text DEFAULT '' NOT NULL,
	"duration_ms" integer DEFAULT 4000 NOT NULL,
	"transition" text DEFAULT 'fade' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storyboards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text DEFAULT '故事分镜' NOT NULL,
	"status" "storyboard_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storyboards_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_story_node_id_story_nodes_id_fk" FOREIGN KEY ("story_node_id") REFERENCES "public"."story_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_abilities" ADD CONSTRAINT "character_abilities_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_abilities" ADD CONSTRAINT "character_abilities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_story_node_id_story_nodes_id_fk" FOREIGN KEY ("story_node_id") REFERENCES "public"."story_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyboard_shots" ADD CONSTRAINT "storyboard_shots_storyboard_id_storyboards_id_fk" FOREIGN KEY ("storyboard_id") REFERENCES "public"."storyboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyboard_shots" ADD CONSTRAINT "storyboard_shots_story_node_id_story_nodes_id_fk" FOREIGN KEY ("story_node_id") REFERENCES "public"."story_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyboard_shots" ADD CONSTRAINT "storyboard_shots_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyboards" ADD CONSTRAINT "storyboards_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_project_id_idx" ON "assets" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "character_abilities_project_id_idx" ON "character_abilities" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "character_abilities_name_idx" ON "character_abilities" USING btree ("character_id","name");--> statement-breakpoint
CREATE INDEX "scenes_project_id_idx" ON "scenes" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "storyboard_shots_order_idx" ON "storyboard_shots" USING btree ("storyboard_id","sort_order");