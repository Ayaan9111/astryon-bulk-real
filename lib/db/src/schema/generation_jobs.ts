import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const generationJobsTable = pgTable("generation_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  outputMode: text("output_mode").notNull(),
  listingCount: integer("listing_count").notNull(),
  creditsUsed: integer("credits_used").notNull(),
  results: jsonb("results").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGenerationJobSchema = createInsertSchema(generationJobsTable).omit({ id: true, createdAt: true });
export type InsertGenerationJob = z.infer<typeof insertGenerationJobSchema>;
export type GenerationJob = typeof generationJobsTable.$inferSelect;
