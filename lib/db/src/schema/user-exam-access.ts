import { pgTable, integer, boolean, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { examsTable } from "./exams";

export const userExamAccessTable = pgTable("user_exam_access", {
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  examId: integer("exam_id").notNull().references(() => examsTable.id, { onDelete: "cascade" }),
  isUnlocked: boolean("is_unlocked").notNull().default(false),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.examId] }),
}));

export type UserExamAccess = typeof userExamAccessTable.$inferSelect;
