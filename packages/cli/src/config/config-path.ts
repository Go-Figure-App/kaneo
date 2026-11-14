import { environmentSetting } from "../services/environment-setting.js";
import { join } from "node:path";
import { existsSync } from "node:fs";
import type { Environment } from "../render/capabilities.js";

export function configPath(env: Environment, home: string): string {
  const configured = environmentSetting(env, "CONFIG")?.value;
  if (configured) return configured;
  const base = env.XDG_CONFIG_HOME || join(home, ".config");
  const current = join(base, "tracing", "config.json");
  const legacy = join(base, "kaneo", "config.json");
  return !existsSync(current) && existsSync(legacy) ? legacy : current;
}
