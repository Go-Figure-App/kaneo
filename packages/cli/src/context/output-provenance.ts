import { environmentSetting } from "../services/environment-setting.js";
import type { OutputMode } from "../output/output-mode.js";
import type { Environment } from "../render/capabilities.js";

export type OutputSource = "flag" | "env" | "terminal" | "pipe";

export function outputProvenance(input: {
  readonly json: boolean;
  readonly human: boolean;
  readonly env: Environment;
  readonly stdoutIsTTY: boolean;
}): {
  readonly mode: OutputMode;
  readonly source: OutputSource;
  readonly variable?: string;
} {
  if (input.json) return { mode: "json", source: "flag" };
  if (input.human) return { mode: "human", source: "flag" };
  if (
    environmentSetting(input.env, "JSON")?.value === "true" ||
    environmentSetting(input.env, "JSON")?.value === "1"
  ) {
    return {
      mode: "json",
      source: "env",
      variable: environmentSetting(input.env, "JSON")?.name,
    };
  }
  return input.stdoutIsTTY
    ? { mode: "human", source: "terminal" }
    : { mode: "json", source: "pipe" };
}
