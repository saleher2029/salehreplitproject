import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { examsTable } from "./exams";

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => examsTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  imageUrl: text("image_url"),
  optionA: text("option_a").notNull(),
  optionAImage: text("option_a_image"),
  optionB: text("option_b").notNull(),
  optionBImage: text("option_b_image"),
  optionC: text("option_c").notNull(),
  optionCImage: text("option_c_image"),
  optionD: text("option_d").notNull(),
  optionDImage: text("option_d_image"),
  correctOption: text("correct_option").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
});

export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ id: true });
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questionsTable.$inferSelect;
