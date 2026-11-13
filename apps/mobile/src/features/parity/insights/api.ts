import { request } from "@/lib/api/client";

export type InsightMeasure = "velocity" | "throughput" | "cycle-time";
export type InsightReport = {
  measure: InsightMeasure;
  slice: string;
  from: string;
  to: string;
  timeZone: string;
  estimates: boolean;
  historyAvailable: boolean;
  partialHistory: boolean;
  rows: {
    key: string;
    label: string | null;
    series: string;
    value: number;
    points: number | null;
    samples: number;
  }[];
};
export const insightsApi = {
  report: (workspaceId: string, cycleId: string, measure: InsightMeasure) =>
    request<InsightReport>(
      `api/parity/insights/${encodeURIComponent(workspaceId)}`,
      {
        query: {
          cycleId,
          measure,
          slice: measure === "throughput" ? "week" : "cycle",
        },
      },
    ),
};
