import { client } from "@tracing/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

const updates = client.parity["status-update"][":parentType"][":parentId"];
export type StatusUpdateInput = InferRequestType<
  (typeof updates)["$post"]
>["json"];
export type ParentType = "project" | "initiative";
export async function getStatusUpdates(
  parentType: ParentType,
  parentId: string,
  page = 1,
) {
  const response = await updates.$get({
    param: { parentType, parentId },
    query: { page: String(page), pageSize: "20" },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function createStatusUpdate(
  parentType: ParentType,
  parentId: string,
  json: StatusUpdateInput,
) {
  const response = await updates.$post({
    param: { parentType, parentId },
    json,
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
