import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const webhookLogsTable = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  payload: text("payload").notNull(),
  status: text("status").notNull().default("processed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWebhookLogSchema = createInsertSchema(webhookLogsTable).omit({ id: true, createdAt: true });
export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;
export type WebhookLog = typeof webhookLogsTable.$inferSelect;
