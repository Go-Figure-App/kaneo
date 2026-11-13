import { beforeEach, expect, it, vi } from "vite-plus/test";
const request = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock("@/lib/api/client", () => ({ request }));
import { cyclesApi } from "./api";
import { estimateChoices, estimateLabel } from "./estimates";
import {
  estimateScales,
  estimateValues,
} from "../../../../../api/src/parity/cycles/estimates";

beforeEach(() => request.mockClear());
it("clears cycles and estimates with explicit nulls and encodes task IDs", async () => {
  await cyclesApi.setCycle("task/one", null);
  await cyclesApi.setEstimate("task/one", null);
  expect(request).toHaveBeenNthCalledWith(
    1,
    "api/parity/task/task%2Fone/cycle",
    { method: "PUT", body: { cycleId: null }, keepNulls: true },
  );
  expect(request).toHaveBeenNthCalledWith(
    2,
    "api/parity/task/task%2Fone/estimate",
    { method: "PUT", body: { estimate: null }, keepNulls: true },
  );
});
it("uses the API's estimate scale values and preserves imported values in labels", () => {
  for (const scale of estimateScales)
    expect(estimateChoices(scale)).toEqual(estimateValues(scale));
  expect(estimateLabel(5, "t-shirt", "en-US")).toBe("L");
  expect(estimateLabel(0, "t-shirt", "en-US")).toBe("0");
  expect(estimateLabel(13, "fibonacci", "en-US")).toBe("13");
});
it("paginates cycles and passes task filters without putting raw IDs in paths", async () => {
  await cyclesApi.list("work/space", "upcoming", 2);
  expect(request).toHaveBeenLastCalledWith("api/parity/cycle/work%2Fspace", {
    query: { phase: "upcoming", page: 2, pageSize: 50 },
  });
  await cyclesApi.detail("cycle/one");
  expect(request).toHaveBeenLastCalledWith("api/parity/cycle/item/cycle%2Fone");
  await cyclesApi.tasks("cycle/one", 3, {
    assigneeId: "me",
    category: "started",
    label: "release",
    search: "100%",
  });
  expect(request).toHaveBeenLastCalledWith(
    "api/parity/cycle/item/cycle%2Fone/tasks",
    {
      query: {
        assigneeId: "me",
        category: "started",
        label: "release",
        search: "100%",
        page: 3,
        pageSize: 100,
      },
    },
  );
});
