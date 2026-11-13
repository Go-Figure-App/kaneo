import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  customFieldDefinitionTable,
  customFieldValueTable,
} from "../../../database/schema";
import {
  isCustomFieldValueEmpty,
  validateCustomFieldValue,
} from "../../../task/validate-task-fields";
import type { Transaction } from "./with-pending-task";

// Anonymous and integration intake can omit required fields. Acceptance must
// materialize defaults as well as validate them, within the decision transaction.
export async function prepareAcceptedFields(
  tx: Transaction,
  taskId: string,
  projectId: string,
) {
  const definitions = await tx
    .select()
    .from(customFieldDefinitionTable)
    .where(eq(customFieldDefinitionTable.projectId, projectId));
  const stored = await tx
    .select()
    .from(customFieldValueTable)
    .where(eq(customFieldValueTable.taskId, taskId));
  const values = new Map(
    stored.map((field) => [field.fieldId, field.value ?? ""]),
  );
  const defaults: { taskId: string; fieldId: string; value: string }[] = [];
  for (const field of definitions) {
    let value = values.get(field.id);
    if (value === undefined && field.required && field.defaultValue !== null) {
      value = field.defaultValue;
      defaults.push({ taskId, fieldId: field.id, value: value.trim() });
    }
    const type = field.type as Parameters<typeof validateCustomFieldValue>[1];
    if (value === undefined || isCustomFieldValueEmpty(value, type)) {
      if (field.required)
        throw new HTTPException(400, {
          message: `Custom field "${field.name}" is required to accept this task.`,
        });
      continue;
    }
    const error = validateCustomFieldValue(
      value,
      type,
      field.name,
      field.options,
    );
    if (error) throw new HTTPException(400, { message: error });
  }
  if (defaults.length) await tx.insert(customFieldValueTable).values(defaults);
}
