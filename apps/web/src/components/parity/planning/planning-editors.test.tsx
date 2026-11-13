import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vite-plus/test";
import {
  createInitiative,
  updateInitiative,
  type Initiative,
} from "@/fetchers/parity/initiatives";
import {
  updateProjectPlan,
  type ProjectPlan,
} from "@/fetchers/parity/projects";
import { InitiativeEditor } from "./initiative-editor";
import { ProjectEditor } from "./project-editor";

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/components/activity/comment-editor", () => ({
  default: () => <textarea aria-label="Description" />,
}));
vi.mock("@/hooks/queries/workspace-users/use-get-project-members", () => ({
  default: () => ({
    data: [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ],
  }),
}));
vi.mock("@/hooks/queries/workspace-users/use-get-workspace-users", () => ({
  default: () => ({
    data: [{ user: { id: "a", name: "A" } }, { user: { id: "b", name: "B" } }],
  }),
}));
vi.mock("@/fetchers/parity/projects", () => ({
  updateProjectPlan: vi.fn(async () => ({})),
}));
vi.mock("@/fetchers/parity/initiatives", () => ({
  updateInitiative: vi.fn(async () => ({})),
  createInitiative: vi.fn(async () => ({ id: "new" })),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it.each(["project", "initiative"] as const)(
  "preserves a concurrent %s owner change until the user explicitly edits the picker",
  async (kind) => {
    const client = new QueryClient();
    const view = (owner: string) => (
      <QueryClientProvider client={client}>
        {kind === "project" ? (
          <ProjectEditor
            project={
              {
                id: "id",
                workspaceId: "workspace",
                status: "planned",
                priority: "medium",
                leadId: owner,
                leadName: owner,
              } as ProjectPlan
            }
            onClose={() => {}}
          />
        ) : (
          <InitiativeEditor
            workspaceId="workspace"
            initiative={
              {
                id: "id",
                name: "Launch",
                description: "Keep",
                status: "planned",
                ownerId: owner,
                ownerName: owner,
              } as Initiative
            }
            onClose={() => {}}
          />
        )}
      </QueryClientProvider>
    );
    const { rerender } = render(view("a"));
    const picker = screen.getByRole("combobox", {
      name: `parity:planning.${kind === "project" ? "lead" : "owner"}`,
    });
    rerender(view("b"));
    expect(picker).toHaveValue("b");
    fireEvent.click(
      screen.getByRole("button", { name: "parity:planning.save" }),
    );
    const save =
      kind === "project"
        ? vi.mocked(updateProjectPlan)
        : vi.mocked(updateInitiative);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][1]).not.toHaveProperty(
      kind === "project" ? "leadId" : "ownerId",
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "parity:planning.save" }),
      ).not.toBeDisabled(),
    );
    fireEvent.change(picker, { target: { value: "" } });
    rerender(view("a"));
    expect(picker).toHaveValue("");
    fireEvent.click(
      screen.getByRole("button", { name: "parity:planning.save" }),
    );
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[1][1]).toHaveProperty(
      kind === "project" ? "leadId" : "ownerId",
      null,
    );
    expect(createInitiative).not.toHaveBeenCalled();
    client.clear();
  },
);
