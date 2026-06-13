CREATE TYPE "public"."foreshadow_importance" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."foreshadow_status" AS ENUM('planned', 'planted', 'revealed');--> statement-breakpoint
CREATE TYPE "public"."inspiration_status" AS ENUM('inbox', 'linked', 'archived');--> statement-breakpoint
CREATE TABLE "foreshadows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"planted_node_id" uuid,
	"reveal_node_id" uuid,
	"status" "foreshadow_status" DEFAULT 'planned' NOT NULL,
	"importance" "foreshadow_importance" DEFAULT 'medium' NOT NULL,
	"last_appeared_chapter" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "foreshadows_last_chapter_positive" CHECK ("foreshadows"."last_appeared_chapter" is null or "foreshadows"."last_appeared_chapter" > 0)
);
--> statement-breakpoint
CREATE TABLE "inspirations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"content" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "inspiration_status" DEFAULT 'inbox' NOT NULL,
	"linked_node_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"label" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "foreshadows" ADD CONSTRAINT "foreshadows_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foreshadows" ADD CONSTRAINT "foreshadows_planted_node_id_story_nodes_id_fk" FOREIGN KEY ("planted_node_id") REFERENCES "public"."story_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foreshadows" ADD CONSTRAINT "foreshadows_reveal_node_id_story_nodes_id_fk" FOREIGN KEY ("reveal_node_id") REFERENCES "public"."story_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspirations" ADD CONSTRAINT "inspirations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspirations" ADD CONSTRAINT "inspirations_linked_node_id_story_nodes_id_fk" FOREIGN KEY ("linked_node_id") REFERENCES "public"."story_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_snapshots" ADD CONSTRAINT "project_snapshots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "foreshadows_project_id_idx" ON "foreshadows" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "inspirations_project_id_idx" ON "inspirations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_snapshots_project_id_idx" ON "project_snapshots" USING btree ("project_id");