import { client, resolveApiBaseUrl } from "@tracing/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

const triage = client.parity.triage;
export type TriageInput = InferRequestType<
  (typeof triage.project)[":projectId"]["$post"]
>["json"];
export type TriageSettingsInput = InferRequestType<
  (typeof triage.settings)[":projectId"]["$put"]
>["json"];
export type TriageDecision =
  | {
      action: "accept";
      body: InferRequestType<
        (typeof triage.item)[":taskId"]["accept"]["$post"]
      >["json"];
    }
  | { action: "decline"; body: { comment: string } }
  | { action: "duplicate"; body: { duplicateOfTaskId: string } }
  | { action: "snooze"; body: { until: string } };

export async function getTriage(
  workspaceId: string,
  projectId?: string,
  page = 1,
) {
  const response = await triage[":workspaceId"].$get({
    param: { workspaceId },
    query: { projectId, page: String(page), pageSize: "50" },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export type TriageItem = Awaited<ReturnType<typeof getTriage>>["items"][number];
export async function getTriageCount(workspaceId: string) {
  const response = await triage[":workspaceId"].count.$get({
    param: { workspaceId },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function getTriageProjects(workspaceId: string) {
  const response = await triage[":workspaceId"].projects.$get({
    param: { workspaceId },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function createTriage(projectId: string, json: TriageInput) {
  const response = await triage.project[":projectId"].$post({
    param: { projectId },
    json,
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function getTriageSettings(projectId: string) {
  const response = await triage.settings[":projectId"].$get({
    param: { projectId },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function updateTriageSettings(
  projectId: string,
  json: TriageSettingsInput,
) {
  const response = await triage.settings[":projectId"].$put({
    param: { projectId },
    json,
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function decideTriage(taskId: string, decision: TriageDecision) {
  const route = triage.item[":taskId"];
  const param = { taskId };
  const response =
    decision.action === "accept"
      ? await route.accept.$post({ param, json: decision.body })
      : decision.action === "decline"
        ? await route.decline.$post({ param, json: decision.body })
        : decision.action === "duplicate"
          ? await route.duplicate.$post({ param, json: decision.body })
          : await route.snooze.$post({ param, json: decision.body });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export async function submitIntake(
  token: string,
  input: { title: string; description: string; reporterEmail: string },
) {
  const response = await fetch(
    `${resolveApiBaseUrl(import.meta.env.VITE_API_URL)}/parity/triage/intake/${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) throw await HttpError.fromResponse(response);
}
