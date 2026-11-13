import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { BulkPlanningDialog } from "./bulk-planning-dialog";
const mocks = vi.hoisted(() => ({ update: vi.fn(), editable: true }));
vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en-US" },
  }),
}));
vi.mock("@/fetchers/parity/cycles", () => ({
  bulkUpdatePlanningTasks: mocks.update,
  getCycleSettings: async () => ({
    cyclesEnabled: true,
    estimateScale: "fibonacci",
  }),
  getCycles: async () => ({
    items: [{ id: "cycle", name: "Launch", number: 1 }],
    page: 1,
    hasMore: false,
  }),
}));
vi.mock("@/fetchers/parity/projects", () => ({
  getMilestones: async () => [{ id: "milestone", name: "Release" }],
}));
vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => ({ canUpdateTasks: () => mocks.editable }),
}));
beforeEach(() => {
  mocks.update.mockReset();
  mocks.update.mockResolvedValue({ updated: 2 });
  mocks.editable = true;
});
afterEach(cleanup);
function mount(taskIds = ["first", "second"]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const close = vi.fn();
  const success = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <BulkPlanningDialog
        taskIds={taskIds}
        projectId="project"
        workspaceId="workspace"
        cycles
        projects
        onClose={close}
        onSuccess={success}
      />
    </QueryClientProvider>,
  );
  return { close, success };
}
it("requires an explicit choice and sends the selected IDs in one atomic estimate mutation", async () => {
  const { close, success } = mount();
  const save = screen.getByRole("button", { name: "parity:planning.save" });
  expect(save).toBeDisabled();
  fireEvent.change(
    screen.getByRole("combobox", { name: "parity:cycles.property" }),
    { target: { value: "updateEstimate" } },
  );
  const value = screen.getByRole("combobox", { name: "parity:cycles.value" });
  await waitFor(() => expect(value).toBeEnabled());
  expect(screen.queryByRole("option", { name: "4" })).toBeNull();
  fireEvent.change(value, { target: { value: "5" } });
  fireEvent.click(save);
  await waitFor(() =>
    expect(mocks.update).toHaveBeenCalledWith(
      { taskIds: ["first", "second"], operation: "updateEstimate", value: 5 },
      expect.anything(),
    ),
  );
  await waitFor(() => expect(success).toHaveBeenCalledOnce());
  expect(close).toHaveBeenCalledOnce();
});
it("preserves the selection on a rejected mutation and supports explicit cycle clearing", async () => {
  mocks.update.mockRejectedValue(new Error("Task no longer readable"));
  const { close, success } = mount();
  const value = screen.getByRole("combobox", { name: "parity:cycles.value" });
  await waitFor(() => expect(value).toBeEnabled());
  fireEvent.change(value, { target: { value: "none" } });
  fireEvent.click(screen.getByRole("button", { name: "parity:planning.save" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Task no longer readable",
  );
  expect(mocks.update.mock.calls[0]?.[0]).toEqual({
    taskIds: ["first", "second"],
    operation: "updateCycle",
    value: null,
  });
  expect(close).not.toHaveBeenCalled();
  expect(success).not.toHaveBeenCalled();
});
it("prevents a selection larger than the atomic API limit", async () => {
  mount(Array.from({ length: 101 }, (_, index) => `task-${index}`));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "parity:cycles.bulkLimit",
  );
  expect(
    screen.getByRole("button", { name: "parity:planning.save" }),
  ).toBeDisabled();
  expect(mocks.update).not.toHaveBeenCalled();
});
