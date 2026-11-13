import { expect, it } from "vite-plus/test";
import { normalizeServerUrl } from "./normalize-server-url";

it("uses the same canonical origin for configured and persisted server URLs", () => {
  for (const input of [
    "kaneo.gofigureapp.io",
    " https://kaneo.gofigureapp.io/api/ ",
    "https://kaneo.gofigureapp.io///",
  ])
    expect(normalizeServerUrl(input)).toBe("https://kaneo.gofigureapp.io");
  expect(normalizeServerUrl(" http://localhost:18173/api/ ")).toBe(
    "http://localhost:18173",
  );
});
