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
import { TaskEstimatePicker } from "./task-estimate-picker";

const mocks = vi.hoisted(() => ({
  enabled: true,
  editable: true,
  current: {} as TaskCycleProperties,
  update: vi.fn(),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en-US" },
  }),
}));
vi.mock("@/fetchers/parity/foundation", () => ({
  getParityFeatures: async () => ({
    features: mocks.enabled ? ["cycles"] : [],
  }),
}));
vi.mock("@/fetchers/parity/cycles", () => ({
  getTaskCycleProperties: async () => mocks.current,
  updateTaskEstimate: mocks.update,
}));
vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => ({ canUpdateTasks: () => mocks.editable }),
}));

beforeEach(() => {
  mocks.enabled = true;
  mocks.editable = true;
  mocks.current = {
    taskId: "task",
    cycle: null,
    estimate: null,
    estimateScale: "fibonacci",
    cyclesEnabled: true,
  };
  mocks.update.mockImplementation(
    async (_taskId: string, estimate: number | null) => {
      mocks.current = { ...mocks.current, estimate };
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
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  client.setQueryData(["parity", "features"], {
    features: mocks.enabled ? ["cycles"] : [],
  });
  render(
    <QueryClientProvider client={client}>
      <ShortcutTestWrapper>
        <div data-task-view>
          <TaskEstimatePicker taskId="task" projectId="project" />
        </div>
      </ShortcutTestWrapper>
    </QueryClientProvider>,
  );
}
async function open() {
  const button = await screen.findByRole("button", {
    name: /^parity:cycles.estimate:/,
  });
  await waitFor(() => expect(button).not.toBeDisabled());
  fireEvent.click(button);
  await screen.findByRole("combobox");
}

it("offers only the workspace scale and clears an assigned estimate", async () => {
  mount();
  await open();
  expect(screen.queryByRole("option", { name: "4" })).toBeNull();
  fireEvent.click(await screen.findByRole("option", { name: "8" }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledWith("task", 8));
  await screen.findByRole("button", { name: "parity:cycles.estimate: 8" });
  await open();
  fireEvent.click(
    await screen.findByRole("option", { name: "parity:cycles.noEstimate" }),
  );
  await waitFor(() =>
    expect(mocks.update).toHaveBeenLastCalledWith("task", null),
  );
});
it("maps T-shirt labels to numeric estimates and reports failed mutations", async () => {
  mocks.current = { ...mocks.current, estimateScale: "t-shirt", estimate: 3 };
  mocks.update.mockRejectedValueOnce(new Error("Permission changed"));
  mount();
  await open();
  fireEvent.click(await screen.findByRole("option", { name: "L" }));
  await screen.findByRole("alert");
  expect(mocks.update).toHaveBeenCalledWith("task", 5);
  expect(screen.getByRole("alert")).toHaveTextContent("Permission changed");
  expect(screen.getByRole("combobox")).toBeInTheDocument();
});
it("opens from Shift+E and respects read-only task permissions", async () => {
  mount();
  const button = await screen.findByRole("button", {
    name: /^parity:cycles.estimate:/,
  });
  await waitFor(() => expect(button).not.toBeDisabled());
  fireEvent.keyDown(document, { key: "E", code: "KeyE", shiftKey: true });
  await screen.findByRole("combobox");
  cleanup();
  mocks.editable = false;
  mount();
  expect(
    await screen.findByRole("button", { name: /^parity:cycles.estimate:/ }),
  ).toBeDisabled();
  fireEvent.keyDown(document, { key: "E", code: "KeyE", shiftKey: true });
  expect(screen.queryByRole("combobox")).toBeNull();
  expect(mocks.update).not.toHaveBeenCalled();
});
it("hides estimates when the scale is disabled but still allows clearing an imported estimate", async () => {
  mocks.current = { ...mocks.current, estimateScale: "none" };
  mount();
  await waitFor(() => expect(screen.queryByRole("button")).toBeNull());
  cleanup();
  mocks.current = { ...mocks.current, estimate: 13 };
  mount();
  await open();
  expect(screen.getAllByRole("option")).toHaveLength(1);
  fireEvent.click(
    screen.getByRole("option", { name: "parity:cycles.noEstimate" }),
  );
  await waitFor(() => expect(mocks.update).toHaveBeenCalledWith("task", null));
});
