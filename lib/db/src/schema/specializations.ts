import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const specializationsTable = pgTable("specializations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSpecializationSchema = createInsertSchema(specializationsTable).omit({ id: true, createdAt: true });
export type InsertSpecialization = z.infer<typeof insertSpecializationSchema>;
export type Specialization = typeof specializationsTable.$inferSelect;
