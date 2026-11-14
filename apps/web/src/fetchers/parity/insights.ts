import { client } from "@tracing/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

const endpoint = client.parity.insights[":workspaceId"];
export type InsightsQuery = InferRequestType<typeof endpoint.$get>["query"];
export type InsightMeasure = InsightsQuery["measure"];
export async function getInsights(workspaceId: string, query: InsightsQuery) {
  const response = await endpoint.$get({ param: { workspaceId }, query });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
export type Insights = Awaited<ReturnType<typeof getInsights>>;
export type InsightRow = Insights["rows"][number];
