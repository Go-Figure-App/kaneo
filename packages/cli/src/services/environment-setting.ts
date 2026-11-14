import type { Environment } from "../render/capabilities.js";

/** Prefer the populated Tracing setting, then its legacy alias. */
export function environmentSetting(
  env: Environment,
  suffix: string,
): { readonly name: string; readonly value: string } | undefined {
  for (const name of [`TRACING_${suffix}`, `KANEO_${suffix}`]) {
    const value = env[name]?.trim();
    if (value) return { name, value };
  }
  return undefined;
}
