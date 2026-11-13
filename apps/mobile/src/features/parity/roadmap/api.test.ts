import { expect, it, vi } from "vite-plus/test";
const request = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ projects: [], initiatives: [] }),
);
vi.mock("@/lib/api/client", () => ({ request }));
import { getRoadmap } from "./api";
it("encodes the workspace scope and only reads the roadmap", async () => {
  expect(await getRoadmap("workspace/one")).toEqual({
    projects: [],
    initiatives: [],
  });
  expect(request).toHaveBeenCalledExactlyOnceWith(
    "api/parity/roadmap/workspace%2Fone",
  );
});
