import { pgTable, serial, integer, timestamp, text, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { examsTable } from "./exams";

export const examResultsTable = pgTable("exam_results", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  examId: integer("exam_id").notNull().references(() => examsTable.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  percentage: real("percentage").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  difficulty: text("difficulty"),             // easy | medium | hard
  notes: text("notes"),                        // student notes
  bookmarkedQuestions: text("bookmarked_questions"), // JSON array of question IDs
});

export const answerDetailsTable = pgTable("answer_details", {
  id: serial("id").primaryKey(),
  resultId: integer("result_id").notNull().references(() => examResultsTable.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull(),
  selectedOption: text("selected_option").notNull(),
  isCorrect: integer("is_correct").notNull().default(0),
});

export const insertExamResultSchema = createInsertSchema(examResultsTable).omit({ id: true, completedAt: true });
export type InsertExamResult = z.infer<typeof insertExamResultSchema>;
export type ExamResult = typeof examResultsTable.$inferSelect;
