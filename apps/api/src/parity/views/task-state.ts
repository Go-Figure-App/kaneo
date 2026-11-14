import { sql } from "drizzle-orm";
import { activityTable, columnTable, taskTable } from "../../database/schema";

// Archiving clears the active column. Resolve the last recorded workflow slug
// against this project's columns, without changing the task's archive state.
export const taskState = sql<string>`coalesce(${columnTable.name}, CASE
  WHEN ${taskTable.status} = 'archived' THEN (
    select workflow.name from ${columnTable} workflow
    where workflow.project_id = ${taskTable.projectId}
      and workflow.slug = (
        select history.event_data->>'newStatus' from ${activityTable} history
        where history.task_id = ${taskTable.id}
          and history.type = 'status_changed'
          and history.event_data->>'newStatus' <> 'archived'
        order by history.created_at desc, history.id desc limit 1
      )
    limit 1
  ) END, ${taskTable.status})`;
