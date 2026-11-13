import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { TriageInbox } from "./inbox";

const state = vi.hoisted(() => ({ total: 51 }));
vi.mock("react-i18next", async (original) => ({
  ...(await original<object>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/components/common/workspace-layout", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/page-title", () => ({ default: () => null }));
vi.mock("@/components/inbox/inbox-task", () => ({ InboxTask: () => null }));
vi.mock("./action-bar", () => ({ TriageActionBar: () => null }));
vi.mock("./new-item", () => ({ NewTriageItem: () => null }));
vi.mock("./queries", () => ({ useTriageEnabled: () => true }));
vi.mock("@/hooks/queries/project/use-get-projects", () => ({
  default: () => ({ data: [] }),
}));
vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => ({ canCreateTasks: () => false }),
}));
vi.mock("@/fetchers/parity/triage", () => ({
  getTriage: async (_workspace: string, _project: string, page: number) => ({
    page,
    pageSize: 50,
    total: state.total,
    items:
      page === 1 || state.total > 50
        ? [
            {
              id: `task-${page}`,
              title: `Page ${page} item`,
              projectSlug: "demo",
              projectName: "Demo",
              number: page,
            },
          ]
        : [],
  }),
}));
afterEach(cleanup);

it("returns to the last available page when another reviewer empties the current page", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <TriageInbox workspaceId="workspace" />
    </QueryClientProvider>,
  );
  await screen.findByText("Page 1 item");
  fireEvent.click(
    screen.getByRole("button", { name: "common:pagination.next" }),
  );
  await screen.findByText("Page 2 item");
  state.total = 50;
  await act(() => client.invalidateQueries({ queryKey: ["parity", "triage"] }));
  await waitFor(() => expect(screen.getByText("1 / 1")).toBeInTheDocument());
  expect(screen.getByText("Page 1 item")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "common:pagination.previous" }),
  ).toBeDisabled();
  client.clear();
});
