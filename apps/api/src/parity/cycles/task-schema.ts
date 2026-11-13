import { nullableResponseTimestamp, responseTimestamp, z } from "../../openapi";
import { id } from "../planning/schema";
import { estimateScales } from "./estimates";

export const cycleReference = z.strictObject({
  id,
  number: z.number(),
  name: z.string().nullable(),
  startsAt: responseTimestamp,
  endsAt: responseTimestamp,
  completedAt: nullableResponseTimestamp,
});
export const taskCycleProperties = z.strictObject({
  taskId: id,
  cycle: cycleReference.nullable(),
  estimate: z.number().nullable(),
  estimateScale: z.enum(estimateScales),
  cyclesEnabled: z.boolean(),
});
const taskIds = z.array(id).min(1).max(100);
export const bulkCycleBody = z.discriminatedUnion("operation", [
  z.strictObject({
    taskIds,
    operation: z.literal("updateCycle"),
    value: id.nullable(),
  }),
  z.strictObject({
    taskIds,
    operation: z.literal("updateEstimate"),
    value: z.number().int().min(0).max(8).nullable(),
  }),
  z.strictObject({
    taskIds,
    operation: z.literal("updateMilestone"),
    value: id.nullable(),
  }),
]);
export type CycleTaskMutation = z.infer<typeof bulkCycleBody>;
