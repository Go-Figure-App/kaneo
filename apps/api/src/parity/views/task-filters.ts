import {
  and,
  eq,
  exists,
  inArray,
  isNull,
  not,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import {
  activityTable,
  columnTable,
  labelTable,
  projectTable,
  taskTable,
} from "../../database/schema";
import {
  cycleTable,
  initiativeTable,
  initiativeProjectTable,
  projectMilestoneTable,
  taskExtTable,
} from "../../database/schema-parity";
import { localMidnight } from "../cycles/calendar";
import { shiftDay } from "../insights/range";
import { taskCategory } from "../planning/progress-query";
import { filtersSchema, type TaskFilter } from "./schema";

// Upstream keeps the recorded creator in activity, not on the task row. Missing
// history remains null; an assignee is never substituted for a creator.
export const taskCreator = sql<
  string | null
>`(select ${activityTable.userId} from ${activityTable} where ${activityTable.taskId} = ${taskTable.id} and ${activityTable.type} in ('created', 'create', 'triage_created') order by ${activityTable.createdAt}, ${activityTable.id} limit 1)`;
export const taskCreatedAt =
  sql`${taskTable.createdAt} AT TIME ZONE 'UTC'`.mapWith(
    (value: string) => new Date(value),
  );
export const taskUpdatedAt =
  sql`${taskTable.updatedAt} AT TIME ZONE 'UTC'`.mapWith(
    (value: string) => new Date(value),
  );
export const taskDueDate = sql`${taskTable.dueDate} AT TIME ZONE 'UTC'`.mapWith(
  (value: string | null) => (value === null ? null : new Date(value)),
);

export function parseTaskFilters(value?: string) {
  try {
    return filtersSchema.parse(value === undefined ? [] : JSON.parse(value));
  } catch {
    throw new HTTPException(400, { message: "Invalid issue filters" });
  }
}
function invert(condition: SQL | undefined, operator: string) {
  return operator === "is-not"
    ? not(sql`coalesce(${condition}, false)`)
    : condition;
}
function matches(column: SQL, values: (string | null)[], operator: string) {
  const present = values.filter((value): value is string => value !== null);
  return invert(
    or(
      present.length ? inArray(column, present) : undefined,
      values.includes(null) ? isNull(column) : undefined,
    ),
    operator,
  );
}
export function taskFilterSql(
  filter: TaskFilter,
  timeZone: string,
): SQL | undefined {
  switch (filter.field) {
    case "state":
      return invert(
        inArray(
          sql`coalesce(${columnTable.name}, ${taskTable.status})`,
          filter.values,
        ),
        filter.operator,
      );
    case "cycle-period":
      return invert(
        sql`${cycleTable.startsAt} <= now() and ${cycleTable.endsAt} > now()`,
        filter.operator,
      );
    case "initiative": {
      const ids = filter.values.filter((id): id is string => id !== null);
      const base = and(
        eq(initiativeProjectTable.projectId, taskTable.projectId),
        eq(initiativeTable.workspaceId, projectTable.workspaceId),
      );
      const query = (selected?: string[]) =>
        exists(
          db
            .select({ id: initiativeTable.id })
            .from(initiativeProjectTable)
            .innerJoin(
              initiativeTable,
              eq(initiativeTable.id, initiativeProjectTable.initiativeId),
            )
            .where(
              and(
                base,
                selected ? inArray(initiativeTable.id, selected) : undefined,
              ),
            ),
        );
      return invert(
        or(
          ids.length ? query(ids) : undefined,
          filter.values.includes(null) ? not(query()) : undefined,
        ),
        filter.operator,
      );
    }
    case "category":
      return invert(inArray(taskCategory, filter.values), filter.operator);
    case "priority":
      return invert(
        inArray(taskTable.priority, filter.values),
        filter.operator,
      );
    case "assignee":
      return matches(sql`${taskTable.userId}`, filter.values, filter.operator);
    case "creator":
      return matches(taskCreator, filter.values, filter.operator);
    case "project":
      return matches(
        sql`${taskTable.projectId}`,
        filter.values,
        filter.operator,
      );
    case "cycle":
      return matches(sql`${cycleTable.id}`, filter.values, filter.operator);
    case "milestone":
      return matches(
        sql`${projectMilestoneTable.id}`,
        filter.values,
        filter.operator,
      );
    case "label": {
      const names = filter.values.filter(
        (name): name is string => name !== null,
      );
      const base = and(
        eq(labelTable.taskId, taskTable.id),
        isNull(labelTable.deletionStartedAt),
      );
      const hasLabel = exists(
        db.select({ id: labelTable.id }).from(labelTable).where(base),
      );
      const selected = names.length
        ? exists(
            db
              .select({ id: labelTable.id })
              .from(labelTable)
              .where(and(base, inArray(labelTable.name, names))),
          )
        : undefined;
      return invert(
        or(selected, filter.values.includes(null) ? not(hasLabel) : undefined),
        filter.operator,
      );
    }
    case "estimate": {
      const column = taskExtTable.estimate;
      if (filter.value === null) return invert(isNull(column), filter.operator);
      if (filter.operator === "before") return sql`${column} < ${filter.value}`;
      if (filter.operator === "after") return sql`${column} > ${filter.value}`;
      return invert(eq(column, filter.value), filter.operator);
    }
    default: {
      const column =
        filter.field === "due"
          ? taskDueDate
          : filter.field === "created"
            ? taskCreatedAt
            : taskExtTable.completedAt;
      if (filter.value === null) return invert(isNull(column), filter.operator);
      const start = localMidnight(filter.value, timeZone).toISOString();
      const end = localMidnight(
        shiftDay(filter.value, 1),
        timeZone,
      ).toISOString();
      if (filter.operator === "before")
        return sql`${column} < ${start}::timestamptz`;
      if (filter.operator === "after")
        return sql`${column} >= ${end}::timestamptz`;
      return invert(
        sql`${column} >= ${start}::timestamptz and ${column} < ${end}::timestamptz`,
        filter.operator,
      );
    }
  }
}
