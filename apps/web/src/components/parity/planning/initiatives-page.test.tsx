import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import {
  getInitiatives,
  reorderInitiatives,
} from "@/fetchers/parity/initiatives";
import { HttpError } from "@/lib/http-error";
import { clearParityOnAccessError } from "../foundation/access-error";
import { InitiativesPage } from "./initiatives-page";

const permissions = vi.hoisted(() => ({
  canUpdateProjects: vi.fn(() => false),
}));
beforeEach(() => permissions.canUpdateProjects.mockReturnValue(false));

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => (
    <a href="#initiative">{children}</a>
  ),
  useNavigate: () => vi.fn(),
}));
vi.mock("@/components/common/workspace-layout", () => ({
  default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/components/page-title", () => ({ default: () => null }));
vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => permissions,
}));
vi.mock("./queries", () => ({
  usePlanningEnabled: () => true,
  refreshPlanning: vi.fn(),
}));
vi.mock("./initiative-editor", () => ({ InitiativeEditor: () => null }));
vi.mock("@/fetchers/parity/initiatives", () => ({
  getInitiatives: vi.fn(),
  reorderInitiatives: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it.each([403, 404, 500])(
  "hides cached initiative rows after a failed refresh (%s)",
  async (status) => {
    const client = new QueryClient({
      queryCache: new QueryCache({
        onError: (error, query) =>
          clearParityOnAccessError(client, error, query.queryKey),
      }),
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });
    const key = ["parity", "initiatives", "workspace", false];
    client.setQueryData(key, {
      pages: [
        {
          items: [
            {
              id: "private",
              name: "Previously visible initiative",
              status: "active",
              health: "on_track",
              progress: { total: 1, completed: 0, percent: 0 },
            },
          ],
          hasMore: false,
          page: 1,
          pageSize: 100,
        },
      ],
      pageParams: [1],
    });
    render(
      <QueryClientProvider client={client}>
        <InitiativesPage workspaceId="workspace" />
      </QueryClientProvider>,
    );
    expect(
      screen.getByText("Previously visible initiative"),
    ).toBeInTheDocument();
    vi.mocked(getInitiatives).mockRejectedValue(
      new HttpError(status, "Access failed"),
    );
    await act(async () => {
      await client.invalidateQueries({ queryKey: key });
    });
    await waitFor(() =>
      expect(
        screen.queryByText("Previously visible initiative"),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Access failed");
    if (status !== 500) expect(client.getQueryData(key)).toBeUndefined();
    client.clear();
  },
);

it("enables reordering only after all pages are loaded and submits the new order", async () => {
  permissions.canUpdateProjects.mockReturnValue(true);
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  const key = ["parity", "initiatives", "workspace", false];
  const item = (id: string) => ({
    id,
    name: id,
    status: "active",
    health: "on_track",
    progress: { total: 1, completed: 0, percent: 0 },
  });
  const first = { items: [item("first")], hasMore: true, page: 1, pageSize: 1 };
  client.setQueryData(key, { pages: [first], pageParams: [1] });
  render(
    <QueryClientProvider client={client}>
      <InitiativesPage workspaceId="workspace" />
    </QueryClientProvider>,
  );
  expect(
    screen.queryByRole("button", { name: "parity:planning.moveUp" }),
  ).not.toBeInTheDocument();
  await act(async () => {
    client.setQueryData(key, {
      pages: [
        first,
        { items: [item("second")], hasMore: false, page: 2, pageSize: 1 },
      ],
      pageParams: [1, 2],
    });
  });
  const moveUp = await screen.findAllByRole("button", {
    name: "parity:planning.moveUp",
  });
  expect(moveUp).toHaveLength(2);
  expect(moveUp[0]).toBeDisabled();
  fireEvent.click(moveUp[1]);
  await waitFor(() =>
    expect(reorderInitiatives).toHaveBeenCalledWith("workspace", [
      "second",
      "first",
    ]),
  );
  client.clear();
});
