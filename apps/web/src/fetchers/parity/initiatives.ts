import { client } from "@tracing/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

const initiatives = client.parity.initiative;
export type InitiativeInput = InferRequestType<
  (typeof initiatives)[":workspaceId"]["$post"]
>["json"];
export type InitiativePatch = InferRequestType<
  (typeof initiatives.item)[":id"]["$put"]
>["json"];
export async function getInitiatives(
  workspaceId: string,
  page = 1,
  includeArchived = false,
) {
  const response = await initiatives[":workspaceId"].$get({
    param: { workspaceId },
    query: {
      page: String(page),
      pageSize: "100",
      includeArchived: includeArchived ? "true" : "false",
    },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function getInitiative(id: string) {
  const response = await initiatives.item[":id"].$get({ param: { id } });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export type Initiative = Awaited<ReturnType<typeof getInitiative>>;
export async function createInitiative(
  workspaceId: string,
  json: InitiativeInput,
) {
  const response = await initiatives[":workspaceId"].$post({
    param: { workspaceId },
    json,
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function updateInitiative(id: string, json: InitiativePatch) {
  const response = await initiatives.item[":id"].$put({ param: { id }, json });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function deleteInitiative(id: string) {
  const response = await initiatives.item[":id"].$delete({ param: { id } });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function linkInitiativeProject(
  id: string,
  projectId: string,
  position?: number,
) {
  const response = await initiatives.item[":id"].project[":projectId"].$post({
    param: { id, projectId },
    json: { position },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function unlinkInitiativeProject(id: string, projectId: string) {
  const response = await initiatives.item[":id"].project[":projectId"].$delete({
    param: { id, projectId },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function reorderInitiatives(workspaceId: string, ids: string[]) {
  const response = await initiatives[":workspaceId"].reorder.$post({
    param: { workspaceId },
    json: { ids },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
