import { pgTable, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const siteSettingsTable = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  whatsappNumber: text("whatsapp_number").notNull().default("+970599000000"),
  subscriptionInfo: text("subscription_info").notNull().default("للاشتراك في الموقع، يرجى التواصل معنا عبر واتساب"),
});

export const insertSettingsSchema = createInsertSchema(siteSettingsTable).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type SiteSettings = typeof siteSettingsTable.$inferSelect;
