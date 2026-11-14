import { afterEach, expect, it, vi } from "vite-plus/test";
import { isCloud } from "./is-cloud";

afterEach(() => vi.unstubAllEnvs());

it("retains legacy cloud protections when the new setting is empty", () => {
  vi.stubEnv("TRACING_CLOUD", "");
  vi.stubEnv("KANEO_CLOUD", "true");
  expect(isCloud()).toBe(true);
});

it("honors an explicit new setting ahead of the legacy alias", () => {
  vi.stubEnv("TRACING_CLOUD", "false");
  vi.stubEnv("KANEO_CLOUD", "true");
  expect(isCloud()).toBe(false);
});
