import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import type { TaskCycleProperties } from "@/fetchers/parity/cycles";
import { shortcutRegistry } from "@/lib/shortcuts/registry";
import { ShortcutTestWrapper } from "@/lib/shortcuts/shortcut-test-wrapper";
import { TaskCyclePicker } from "./task-cycle-picker";
const mocks = vi.hoisted(() => ({
  editable: true,
  current: {} as TaskCycleProperties,
  update: vi.fn(),
  list: vi.fn(),
  read: vi.fn(),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en-US" },
  }),
}));
vi.mock("../planning/queries", () => ({
  usePlanningEnabled: () => true,
  refreshPlanning: async (client: QueryClient) => {
    await client.invalidateQueries({ queryKey: ["parity"] });
  },
}));
vi.mock("@/fetchers/parity/cycles", () => ({
  getTaskCycleProperties: mocks.read,
  getCycles: mocks.list,
  updateTaskCycle: mocks.update,
}));
vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => ({ canUpdateTasks: () => mocks.editable }),
}));
const cycle = {
  id: "cycle",
  name: "Launch",
  number: 1,
  startsAt: "2026-11-09T00:00:00Z",
  endsAt: "2026-11-16T00:00:00Z",
  completedAt: null,
};
beforeEach(() => {
  mocks.editable = true;
  mocks.current = {
    taskId: "task",
    estimate: null,
    estimateScale: "none",
    cycle: null,
    cyclesEnabled: true,
  };
  mocks.read.mockImplementation(async () => mocks.current);
  mocks.list.mockResolvedValue({
    items: [{ ...cycle, phase: "current" }],
    page: 1,
    hasMore: false,
  });
  mocks.update.mockImplementation(
    async (_taskId: string, cycleId: string | null) => {
      mocks.current = { ...mocks.current, cycle: cycleId ? cycle : null };
      return mocks.current;
    },
  );
  vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([
    new DOMRect(),
  ] as unknown as DOMRectList);
});
afterEach(() => {
  cleanup();
  shortcutRegistry.reset();
  vi.resetAllMocks();
  vi.restoreAllMocks();
});
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ShortcutTestWrapper>
        <div data-task-view>
          <TaskCyclePicker
            taskId="task"
            projectId="project"
            workspaceId="workspace"
          />
        </div>
      </ShortcutTestWrapper>
    </QueryClientProvider>,
  );
  return client;
}
async function open() {
  fireEvent.click(
    await screen.findByRole("button", { name: /^parity:cycles.cycle:/ }),
  );
  await screen.findByRole("combobox");
}
it("loads choices on demand, opens with Shift+C and sets and clears the selected cycle", async () => {
  mount();
  await screen.findByRole("button", { name: /^parity:cycles.cycle:/ });
  expect(mocks.list).not.toHaveBeenCalled();
  fireEvent.keyDown(document, { key: "C", code: "KeyC", shiftKey: true });
  fireEvent.click(await screen.findByRole("option", { name: /Launch/ }));
  await waitFor(() =>
    expect(mocks.update).toHaveBeenCalledWith("task", "cycle"),
  );
  await screen.findByRole("button", { name: "parity:cycles.cycle: Launch" });
  await open();
  fireEvent.click(
    await screen.findByRole("option", { name: "parity:cycles.noCycle" }),
  );
  await waitFor(() =>
    expect(mocks.update).toHaveBeenLastCalledWith("task", null),
  );
});
it("keeps clearing available after cycles are disabled and blocks viewer changes", async () => {
  mocks.current = { ...mocks.current, cycle, cyclesEnabled: false };
  mount();
  await open();
  expect(mocks.list).not.toHaveBeenCalled();
  expect(screen.getAllByRole("option")).toHaveLength(1);
  fireEvent.click(
    screen.getByRole("option", { name: "parity:cycles.noCycle" }),
  );
  await waitFor(() => expect(mocks.update).toHaveBeenCalledWith("task", null));
  cleanup();
  mocks.current = { ...mocks.current, cycle, cyclesEnabled: true };
  mocks.editable = false;
  mount();
  expect(
    await screen.findByRole("button", { name: /^parity:cycles.cycle:/ }),
  ).toBeDisabled();
});
it("removes stale task properties after access is revoked", async () => {
  mocks.current = { ...mocks.current, cycle };
  const client = mount();
  await screen.findByRole("button", { name: "parity:cycles.cycle: Launch" });
  mocks.read.mockRejectedValue(new Error("Task not found"));
  await actRefetch(client);
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: /Launch/ })).toBeNull(),
  );
});
async function actRefetch(client: QueryClient) {
  await client.invalidateQueries({ queryKey: ["parity"] });
}
