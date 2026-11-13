import { and, eq, inArray, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  assetTable,
  customFieldDefinitionTable,
  customFieldValueTable,
  taskTable,
} from "../../../database/schema";
import { extractAssetIds } from "../../../storage/cleanup-assets";
import {
  findNewHiddenPicks,
  isChoiceType,
  readHiddenOptions,
  readOptions,
} from "../../../custom-field/choice-options";
import {
  validateCustomFieldValue,
  isCustomFieldValueEmpty,
} from "../../../task/validate-task-fields";
import type { CreateTriageInput } from "../schema";
import type { Transaction } from "./with-pending-task";

export async function saveMemberFields(
  tx: Transaction,
  task: typeof taskTable.$inferSelect,
  userId: string,
  workspaceId: string,
  input: CreateTriageInput,
) {
  const fields = await tx
    .select()
    .from(customFieldDefinitionTable)
    .where(eq(customFieldDefinitionTable.projectId, task.projectId));
  const values = new Map(
    (input.customFields ?? []).map((item) => [item.fieldId, item.value]),
  );
  for (const field of fields)
    if (!values.has(field.id) && field.required && field.defaultValue !== null)
      values.set(field.id, field.defaultValue);
  for (const [fieldId, value] of values) {
    const field = fields.find((item) => item.id === fieldId);
    if (!field)
      throw new HTTPException(400, {
        message: "Custom field does not belong to this project",
      });
    const type = field.type as Parameters<typeof validateCustomFieldValue>[1];
    if (!isCustomFieldValueEmpty(value, type)) {
      const error = validateCustomFieldValue(
        value,
        type,
        field.name,
        field.options,
      );
      if (error) throw new HTTPException(400, { message: error });
      if (
        isChoiceType(field.type) &&
        findNewHiddenPicks(
          value,
          null,
          field.type,
          readHiddenOptions(field.hiddenOptions, readOptions(field.options)),
        ).length
      )
        throw new HTTPException(400, {
          message: "A hidden custom field option cannot be selected",
        });
    }
  }
  if (values.size)
    await tx.insert(customFieldValueTable).values(
      [...values].map(([fieldId, value]) => ({
        taskId: task.id,
        fieldId,
        value: value.trim(),
      })),
    );
  const referenced = extractAssetIds(input.description);
  const ids = [...new Set(input.draftAssetIds ?? [])].filter((id) =>
    referenced.has(id),
  );
  if (ids.length) {
    const claimed = await tx
      .update(assetTable)
      .set({ taskId: task.id, surface: "description", workspaceId })
      .where(
        and(
          inArray(assetTable.id, ids),
          eq(assetTable.projectId, task.projectId),
          eq(assetTable.createdBy, userId),
          eq(assetTable.surface, "draft"),
          isNull(assetTable.taskId),
        ),
      )
      .returning({ id: assetTable.id });
    if (claimed.length !== ids.length)
      throw new HTTPException(400, {
        message:
          "Some staged uploads are unavailable or belong to another owner/project",
      });
  }
}
