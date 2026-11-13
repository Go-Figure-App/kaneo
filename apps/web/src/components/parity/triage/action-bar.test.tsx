import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vite-plus/test";
import type { TriageItem } from "@/fetchers/parity/triage";
import { TriageActionBar } from "./action-bar";

const permissions = vi.hoisted(() => ({ update: true }));
vi.mock("react-i18next", async (original) => ({
  ...(await original<object>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => ({ canUpdateTasks: () => permissions.update }),
}));
vi.mock("./decision-form", () => ({
  TriageDecisionForm: ({ action }: { action: string }) => (
    <div data-testid="decision">{action}</div>
  ),
}));
const item = { id: "task", title: "Incoming report" } as TriageItem;
afterEach(() => {
  cleanup();
  permissions.update = true;
});

it.each([
  ["1", "accept"],
  ["2", "duplicate"],
  ["3", "decline"],
  ["h", "snooze"],
])("opens the %s decision without submitting it", (key, action) => {
  render(<TriageActionBar item={item} workspaceId="workspace" />);
  const button = screen.getByRole("button", { name: /parity:triage.accept/ });
  button.focus();
  fireEvent.keyDown(button, { key });
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByTestId("decision")).toHaveTextContent(action);
});

it("does not intercept typing, editor input, modifiers, composition or repeated keys", () => {
  render(
    <>
      <input aria-label="Title" />
      <div contentEditable data-testid="editor" />
      <TriageActionBar item={item} workspaceId="workspace" />
    </>,
  );
  fireEvent.keyDown(screen.getByRole("textbox", { name: "Title" }), {
    key: "1",
  });
  fireEvent.keyDown(screen.getByTestId("editor"), { key: "2" });
  const button = screen.getByRole("button", { name: /parity:triage.accept/ });
  button.focus();
  for (const options of [
    { ctrlKey: true },
    { metaKey: true },
    { altKey: true },
    { repeat: true },
    { isComposing: true },
  ])
    fireEvent.keyDown(button, { key: "3", ...options });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("hides decisions and ignores keyboard shortcuts without task-update permission", () => {
  permissions.update = false;
  render(<TriageActionBar item={item} workspaceId="workspace" />);
  fireEvent.keyDown(window, { key: "1" });
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("ignores character shortcuts while focus is outside the action bar", () => {
  render(
    <>
      <button>Task list</button>
      <TriageActionBar item={item} workspaceId="workspace" />
    </>,
  );
  const list = screen.getByRole("button", { name: "Task list" });
  list.focus();
  fireEvent.keyDown(list, { key: "1" });
  fireEvent.keyDown(window, { key: "h" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
