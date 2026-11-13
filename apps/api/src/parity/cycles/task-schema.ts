import { nullableResponseTimestamp, responseTimestamp, z } from "../../openapi";
import { id } from "../planning/schema";
import { estimateScales } from "./estimates";

export const cycleReference = z.object({
  id,
  number: z.number(),
  name: z.string().nullable(),
  startsAt: responseTimestamp,
  endsAt: responseTimestamp,
  completedAt: nullableResponseTimestamp,
});
export const taskCycleProperties = z.object({
  taskId: id,
  cycle: cycleReference.nullable(),
  estimate: z.number().nullable(),
  estimateScale: z.enum(estimateScales),
  cyclesEnabled: z.boolean(),
});
const taskIds = z.array(id).min(1).max(100);
export const bulkCycleBody = z.discriminatedUnion("operation", [
  z.object({
    taskIds,
    operation: z.literal("updateCycle"),
    value: id.nullable(),
  }),
  z.object({
    taskIds,
    operation: z.literal("updateEstimate"),
    value: z.number().int().min(0).max(8).nullable(),
  }),
  z.object({
    taskIds,
    operation: z.literal("updateMilestone"),
    value: id.nullable(),
  }),
]);
export type CycleTaskMutation = z.infer<typeof bulkCycleBody>;
