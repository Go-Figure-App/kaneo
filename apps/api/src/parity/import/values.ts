import { createHash } from "node:crypto";
import type { EstimateScale } from "../cycles/estimates";

// Stable within an import run, isolated from other workspaces and later imports.
export function importId(runId: string, kind: string, sourceId: string) {
  return `lin_${createHash("sha256")
    .update(JSON.stringify([runId, kind, sourceId]))
    .digest("hex")
    .slice(0, 32)}`;
}
export function instant(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) &&
    date.getUTCFullYear() >= 1 &&
    date.getUTCFullYear() <= 9999
    ? date
    : null;
}
export function dateOnly(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = instant(`${value}T00:00:00.000Z`);
  return date?.toISOString().slice(0, 10) === value ? value : null;
}
export function requiredInstant(value: string, field: string): Date {
  const date = instant(value);
  if (!date) throw new Error(`Linear returned an invalid ${field} timestamp.`);
  return date;
}
export function health(value: string | null) {
  return value === "atRisk"
    ? "at_risk"
    : value === "offTrack"
      ? "off_track"
      : "on_track";
}
export function projectStatus(value: string) {
  if (
    [
      "backlog",
      "planned",
      "started",
      "paused",
      "completed",
      "canceled",
    ].includes(value)
  )
    return value as
      | "backlog"
      | "planned"
      | "started"
      | "paused"
      | "completed"
      | "canceled";
  throw new Error(`Unsupported Linear project status: ${value}`);
}
export function estimateScale(value: string): EstimateScale | null {
  const normalized = value.toLowerCase().replace(/[^a-z]/g, "");
  return normalized === "tshirt"
    ? "t-shirt"
    : ["none", "linear", "fibonacci"].includes(normalized)
      ? (normalized as EstimateScale)
      : null;
}
export function timeZone(value: string) {
  try {
    return new Intl.DateTimeFormat("en", { timeZone: value }).resolvedOptions()
      .timeZone;
  } catch {
    return "UTC";
  }
}
