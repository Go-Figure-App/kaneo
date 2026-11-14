import { describe, expect, it } from "vite-plus/test";
import { normalizeApiServerUrl } from "../../../apps/api/src/utils/openapi-spec";

describe("normalizeApiServerUrl", () => {
  it("appends /api when the base has no api suffix", () => {
    expect(normalizeApiServerUrl("https://tracing.gofigureapp.io")).toBe(
      "https://tracing.gofigureapp.io/api",
    );
  });

  it("leaves a URL that already ends with /api alone", () => {
    expect(normalizeApiServerUrl("https://tracing.gofigureapp.io/api")).toBe(
      "https://tracing.gofigureapp.io/api",
    );
  });

  it("strips trailing slashes before appending", () => {
    expect(normalizeApiServerUrl("https://tracing.gofigureapp.io///")).toBe(
      "https://tracing.gofigureapp.io/api",
    );
    expect(normalizeApiServerUrl("https://tracing.gofigureapp.io/api/")).toBe(
      "https://tracing.gofigureapp.io/api",
    );
  });
});
