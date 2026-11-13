import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";

export const parityFeatures = [
  "foundation",
  "triage",
  "projects",
  "initiatives",
  "roadmap",
  "cycles",
  "insights",
  "views",
  "import",
] as const;
export type ParityFeature = (typeof parityFeatures)[number];

export function enabledFeatures(
  value = process.env.PARITY_FEATURES ?? "",
): ParityFeature[] {
  const requested = new Set(value.split(",").map((name) => name.trim()));
  const enabled = parityFeatures.filter((feature) => requested.has(feature));
  return enabled.length
    ? ["foundation", ...enabled.filter((feature) => feature !== "foundation")]
    : [];
}

export function requireParity(feature: ParityFeature) {
  return async (_c: Context, next: Next) => {
    if (!enabledFeatures().includes(feature))
      throw new HTTPException(404, { message: "Feature not enabled" });
    return next();
  };
}
