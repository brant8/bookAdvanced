CREATE TABLE "character_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"source_character_id" uuid NOT NULL,
	"target_character_id" uuid NOT NULL,
	"relation_type" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"strength" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "character_relations_distinct_characters" CHECK ("character_relations"."source_character_id" <> "character_relations"."target_character_id"),
	CONSTRAINT "character_relations_strength_range" CHECK ("character_relations"."strength" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "character_relations" ADD CONSTRAINT "character_relations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_relations" ADD CONSTRAINT "character_relations_source_character_id_characters_id_fk" FOREIGN KEY ("source_character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_relations" ADD CONSTRAINT "character_relations_target_character_id_characters_id_fk" FOREIGN KEY ("target_character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "character_relations_project_id_idx" ON "character_relations" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "character_relations_pair_type_idx" ON "character_relations" USING btree ("source_character_id","target_character_id","relation_type");