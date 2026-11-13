import { sql, type SQLWrapper } from "drizzle-orm";
import { taskExtTable } from "../../database/schema-parity";

/** Apply to the shared WHERE clause so cards, pagination and counts agree. */
export function acceptedTaskCondition(taskId: SQLWrapper) {
  return sql`NOT EXISTS (
    SELECT 1 FROM ${taskExtTable}
    WHERE ${taskExtTable.taskId} = ${taskId}
      AND ${taskExtTable.triageState} = 'pending'
  )`;
}
