import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import type { CycleSettings } from "@/fetchers/parity/cycles";
import { CycleSettingsDialog } from "./settings-dialog";
const mocks = vi.hoisted(() => ({ save: vi.fn(), editable: true }));
vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en-US" },
  }),
}));
vi.mock("@/fetchers/parity/cycles", () => ({
  updateCycleSettings: mocks.save,
}));
vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => ({ canManageSettings: () => mocks.editable }),
}));
const settings: CycleSettings = {
  workspaceId: "workspace",
  cyclesEnabled: true,
  cycleWeeks: 1,
  cooldownWeeks: 0,
  cycleStartDay: 1,
  upcomingCycles: 2,
  autoRollover: true,
  estimateScale: "fibonacci",
  timeZone: "UTC",
};
beforeEach(() => {
  mocks.save.mockReset();
  mocks.save.mockResolvedValue(settings);
  mocks.editable = true;
});
afterEach(cleanup);
it("saves only edited settings while reflecting concurrent changes to untouched fields", async () => {
  const client = new QueryClient();
  const close = vi.fn();
  const view = (value: CycleSettings) => (
    <QueryClientProvider client={client}>
      <CycleSettingsDialog settings={value} onClose={close} />
    </QueryClientProvider>
  );
  const { rerender } = render(view(settings));
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "parity:cycles.cycleWeeks" }),
    { target: { value: "2" } },
  );
  rerender(
    view({ ...settings, timeZone: "America/New_York", upcomingCycles: 3 }),
  );
  expect(
    screen.getByRole("combobox", { name: "parity:cycles.timeZone" }),
  ).toHaveValue("America/New_York");
  fireEvent.click(screen.getByRole("button", { name: "parity:planning.save" }));
  await waitFor(() =>
    expect(mocks.save).toHaveBeenCalledWith("workspace", { cycleWeeks: 2 }),
  );
  await waitFor(() => expect(close).toHaveBeenCalledOnce());
});
it("locks fields while saving, keeps failed edits visible, and disables viewer changes", async () => {
  let fail!: (error: Error) => void;
  mocks.save.mockReturnValue(
    new Promise((_resolve, reject) => {
      fail = reject;
    }),
  );
  const client = new QueryClient();
  const close = vi.fn();
  const { rerender } = render(
    <QueryClientProvider client={client}>
      <CycleSettingsDialog settings={settings} onClose={close} />
    </QueryClientProvider>,
  );
  const field = screen.getByRole("spinbutton", {
    name: "parity:cycles.cycleWeeks",
  });
  fireEvent.change(field, { target: { value: "3" } });
  fireEvent.click(screen.getByRole("button", { name: "parity:planning.save" }));
  await waitFor(() => expect(field).toBeDisabled());
  fail(new Error("Permission changed"));
  await screen.findByRole("alert");
  expect(field).toHaveValue(3);
  expect(close).not.toHaveBeenCalled();
  mocks.editable = false;
  rerender(
    <QueryClientProvider client={client}>
      <CycleSettingsDialog settings={settings} onClose={close} />
    </QueryClientProvider>,
  );
  expect(field).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "parity:planning.save" }),
  ).toBeDisabled();
});
