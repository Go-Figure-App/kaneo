import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { getInitiatives } from "@/fetchers/parity/initiatives";
import { HttpError } from "@/lib/http-error";
import { clearParityOnAccessError } from "../foundation/access-error";
import { InitiativesPage } from "./initiatives-page";

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
  useWorkspacePermission: () => ({ canUpdateProjects: () => false }),
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
        onError: (error) => clearParityOnAccessError(client, error),
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
