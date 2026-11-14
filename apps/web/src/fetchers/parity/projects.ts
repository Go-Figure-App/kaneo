import { client } from "@tracing/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

const plans = client.parity["project-plan"];
const milestones = client.parity.milestone;
export type PlanInput = InferRequestType<
  (typeof plans)[":projectId"]["$put"]
>["json"];
export type MilestoneInput = InferRequestType<
  (typeof milestones)[":projectId"]["$post"]
>["json"];
export type MilestonePatch = InferRequestType<
  (typeof milestones.item)[":id"]["$put"]
>["json"];

export async function getProjectPlan(projectId: string) {
  const response = await plans[":projectId"].$get({ param: { projectId } });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export type ProjectPlan = Awaited<ReturnType<typeof getProjectPlan>>;
export type Milestone = ProjectPlan["milestones"][number];
export type PlanningProgress = ProjectPlan["progress"];
export async function getProjectPlans(workspaceId: string, page = 1) {
  const response = await plans.workspace[":workspaceId"].$get({
    param: { workspaceId },
    query: { page: String(page), pageSize: "100" },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function updateProjectPlan(projectId: string, json: PlanInput) {
  const response = await plans[":projectId"].$put({
    param: { projectId },
    json,
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function getMilestones(projectId: string) {
  const response = await milestones[":projectId"].$get({
    param: { projectId },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function createMilestone(projectId: string, json: MilestoneInput) {
  const response = await milestones[":projectId"].$post({
    param: { projectId },
    json,
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function updateMilestone(id: string, json: MilestonePatch) {
  const response = await milestones.item[":id"].$put({ param: { id }, json });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function deleteMilestone(id: string) {
  const response = await milestones.item[":id"].$delete({ param: { id } });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function getTaskMilestone(taskId: string) {
  const response = await client.parity.task[":taskId"].milestone.$get({
    param: { taskId },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function setTaskMilestone(
  taskId: string,
  milestoneId: string | null,
) {
  const response = await client.parity.task[":taskId"].milestone.$put({
    param: { taskId },
    json: { milestoneId },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
