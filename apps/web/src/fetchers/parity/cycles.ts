import { client } from "@tracing/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

const tasks = client.parity.task[":taskId"];
const cycles = client.parity.cycle;
export type CyclePhase = "current" | "upcoming" | "past";
export type CycleSettingsInput = InferRequestType<
  (typeof cycles.settings)[":workspaceId"]["$put"]
>["json"];
export type CycleEdit = InferRequestType<
  (typeof cycles.item)[":id"]["$put"]
>["json"];
export type CycleTaskFilters = Omit<
  InferRequestType<(typeof cycles.item)[":id"]["tasks"]["$get"]>["query"],
  "page" | "pageSize"
>;
export type BulkPlanningChange = InferRequestType<
  typeof client.parity.task.bulk.$patch
>["json"];
export async function bulkUpdatePlanningTasks(json: BulkPlanningChange) {
  const response = await client.parity.task.bulk.$patch({ json });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function getCycleSettings(workspaceId: string) {
  const response = await cycles.settings[":workspaceId"].$get({
    param: { workspaceId },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function getCycles(
  workspaceId: string,
  phase: CyclePhase | "all" = "all",
  page = 1,
) {
  const response = await cycles[":workspaceId"].$get({
    param: { workspaceId },
    query: { phase, page: String(page), pageSize: "50" },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export type Cycle = Awaited<ReturnType<typeof getCycles>>["items"][number];
export type CycleSettings = Awaited<ReturnType<typeof getCycles>>["settings"];
export async function getCycle(id: string) {
  const response = await cycles.item[":id"].$get({ param: { id } });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export type CycleDetail = Awaited<ReturnType<typeof getCycle>>;
export async function getCycleTasks(
  id: string,
  page = 1,
  filters: CycleTaskFilters = {},
) {
  const response = await cycles.item[":id"].tasks.$get({
    param: { id },
    query: { ...filters, page: String(page), pageSize: "100" },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export type CycleTask = Awaited<
  ReturnType<typeof getCycleTasks>
>["items"][number];
export async function updateCycleSettings(
  workspaceId: string,
  json: CycleSettingsInput,
) {
  const response = await cycles.settings[":workspaceId"].$put({
    param: { workspaceId },
    json,
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function updateCycle(id: string, json: CycleEdit) {
  const response = await cycles.item[":id"].$put({ param: { id }, json });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function getTaskCycleProperties(taskId: string) {
  const response = await tasks["cycle-properties"].$get({ param: { taskId } });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export type TaskCycleProperties = Awaited<
  ReturnType<typeof getTaskCycleProperties>
>;
export async function updateTaskEstimate(
  taskId: string,
  estimate: number | null,
) {
  const response = await tasks.estimate.$put({
    param: { taskId },
    json: { estimate },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function updateTaskCycle(taskId: string, cycleId: string | null) {
  const response = await tasks.cycle.$put({
    param: { taskId },
    json: { cycleId },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function getProjectCycleTasks(projectId: string) {
  const response = await cycles.project[":projectId"].tasks.$get({
    param: { projectId },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
