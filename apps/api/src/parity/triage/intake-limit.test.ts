import { describe, expect, it } from "vite-plus/test";
import { IntakeLimiter } from "./intake-limit";
import {
  integrationConfig,
  integrationTriageEnabled,
} from "./integration-config";

describe("public intake quotas", () => {
  it("bounds one address even when tokens change and resets after the window", () => {
    let now = 1_000;
    const limiter = new IntakeLimiter(() => now);
    for (let i = 0; i < 20; i++)
      expect(limiter.allow(String(i), "127.0.0.1")).toBe(true);
    expect(limiter.allow("another", "127.0.0.1")).toBe(false);
    now += 60_000;
    expect(limiter.allow("another", "127.0.0.1")).toBe(true);
  });
  it("bounds one token across addresses and treats missing transport addresses as one bucket", () => {
    const limiter = new IntakeLimiter();
    for (let i = 0; i < 30; i++)
      expect(limiter.allow("token", String(i))).toBe(true);
    expect(limiter.allow("token", "next")).toBe(false);
    for (let i = 0; i < 20; i++)
      expect(limiter.allow("other", null)).toBe(true);
    expect(limiter.allow("other", null)).toBe(false);
  });
  it("caps total submissions even when every key differs", () => {
    const limiter = new IntakeLimiter();
    for (let i = 0; i < 300; i++)
      expect(limiter.allow(String(i), String(i))).toBe(true);
    expect(limiter.allow("new", "new")).toBe(false);
  });
});

it("requires an explicit integration opt-in and rejects malformed configuration", () => {
  for (const value of [
    "",
    "[]",
    "null",
    '{"parityTriageEnabled":"true"}',
    '{"nested":{"parityTriageEnabled":true}}',
  ])
    expect(integrationTriageEnabled(value)).toBe(false);
  expect(integrationTriageEnabled('{"parityTriageEnabled":true}')).toBe(true);
  expect(() => integrationConfig("invalid")).toThrow();
});
