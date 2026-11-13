import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { useProjectCycleFilter } from "./use-project-cycle-filter";
const mocks = vi.hoisted(() => ({ enabled: true, read: vi.fn() }));
vi.mock("../planning/queries", () => ({
  usePlanningEnabled: () => mocks.enabled,
}));
vi.mock("@/fetchers/parity/cycles", () => ({
  getProjectCycleTasks: mocks.read,
}));
beforeEach(() => {
  mocks.enabled = true;
  localStorage.clear();
  mocks.read.mockReset();
  mocks.read.mockResolvedValue({
    currentCycleId: "current-cycle",
    items: [
      { taskId: "one", cycleId: "current-cycle" },
      { taskId: "two", cycleId: "other" },
    ],
  });
});
afterEach(cleanup);
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderHook(() => useProjectCycleFilter("project", "workspace"), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}
it("fetches only when selected, matches current/specific/unassigned cycles and restores all tasks on clear", async () => {
  const { result } = mount();
  expect(mocks.read).not.toHaveBeenCalled();
  act(() => result.current.setValue("current"));
  expect(result.current.matches({ id: "one" })).toBe(false);
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
  expect(result.current.matches({ id: "one" })).toBe(true);
  expect(result.current.matches({ id: "two" })).toBe(false);
  act(() => result.current.setValue("other"));
  expect(result.current.matches({ id: "two" })).toBe(true);
  act(() => result.current.setValue("none"));
  expect(result.current.matches({ id: "unassigned" })).toBe(true);
  expect(result.current.matches({ id: "one" })).toBe(false);
  act(() => result.current.setValue(null));
  expect(result.current.matches({ id: "one" })).toBe(true);
  expect(mocks.read).toHaveBeenCalledTimes(1);
});
it("keeps failed metadata out of filtered results and ignores saved filters when the feature is off", async () => {
  mocks.read.mockRejectedValue(new Error("Permission changed"));
  localStorage.setItem(
    "kaneo:cycle-filter:workspace:project",
    JSON.stringify("current"),
  );
  const { result, rerender } = mount();
  await waitFor(() => expect(result.current.query.isError).toBe(true));
  expect(result.current.matches({ id: "one" })).toBe(false);
  mocks.enabled = false;
  rerender();
  expect(result.current.value).toBeNull();
  expect(result.current.matches({ id: "one" })).toBe(true);
});
