import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { examsTable } from "./exams";
import { unitsTable } from "./units";

export const examTargetUnitsTable = pgTable("exam_target_units", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => examsTable.id, { onDelete: "cascade" }),
  unitId: integer("unit_id").notNull().references(() => unitsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ExamTargetUnit = typeof examTargetUnitsTable.$inferSelect;
