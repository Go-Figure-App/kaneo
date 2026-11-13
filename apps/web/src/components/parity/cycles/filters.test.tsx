import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { useProjectCycleFilter } from "./use-project-cycle-filter";
import { CycleTaskFiltersBar } from "./task-filters";
const mocks = vi.hoisted(() => ({
  enabled: true,
  read: vi.fn(),
  metadataError: false,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/hooks/queries/project/use-get-projects", () => ({
  default: () => ({
    isError: mocks.metadataError,
    error: mocks.metadataError ? new Error("Unavailable") : null,
    data: [{ id: "project", name: "Project name" }],
  }),
}));
vi.mock("@/hooks/queries/workspace-users/use-get-workspace-users", () => ({
  default: () => ({
    isError: mocks.metadataError,
    error: mocks.metadataError ? new Error("Unavailable") : null,
    data: [{ userId: "member", user: { name: "Member name" } }],
  }),
}));
vi.mock("../planning/queries", () => ({
  usePlanningEnabled: () => mocks.enabled,
}));
vi.mock("@/fetchers/parity/cycles", () => ({
  getProjectCycleTasks: mocks.read,
}));
beforeEach(() => {
  mocks.enabled = true;
  mocks.metadataError = false;
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

it("keeps active project and assignee filters clearable without exposing failed metadata", () => {
  const filters = { projectId: "project", assigneeId: "member" };
  const setFilters = vi.fn();
  const bar = () => (
    <CycleTaskFiltersBar
      workspaceId="workspace"
      filters={filters}
      setFilters={setFilters}
      groupBy="state"
      setGroupBy={vi.fn()}
    />
  );
  const { rerender } = render(bar());
  expect(
    screen.getByRole("option", { name: "Project name" }),
  ).toBeInTheDocument();
  mocks.metadataError = true;
  rerender(bar());
  expect(screen.queryByRole("option", { name: "Project name" })).toBeNull();
  expect(screen.queryByRole("option", { name: "Member name" })).toBeNull();
  const projects = screen.getByRole("combobox", {
    name: "parity:cycles.project",
  });
  const assignees = screen.getByRole("combobox", {
    name: "parity:cycles.assignee",
  });
  expect(projects).toBeEnabled();
  expect(assignees).toBeEnabled();
  expect(projects).toHaveValue("project");
  expect(assignees).toHaveValue("member");
  fireEvent.change(projects, { target: { value: "" } });
  expect(setFilters).toHaveBeenLastCalledWith({
    ...filters,
    projectId: undefined,
  });
  fireEvent.change(assignees, { target: { value: "" } });
  expect(setFilters).toHaveBeenLastCalledWith({
    ...filters,
    assigneeId: undefined,
  });
});
