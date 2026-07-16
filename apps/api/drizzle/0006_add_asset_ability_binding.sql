ALTER TABLE "assets" ADD COLUMN "ability_id" uuid;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_ability_id_character_abilities_id_fk" FOREIGN KEY ("ability_id") REFERENCES "public"."character_abilities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_ability_id_idx" ON "assets" USING btree ("ability_id");--> statement-breakpoint
