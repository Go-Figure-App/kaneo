import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { getSavedView } from "@/fetchers/parity/views";
import { HttpError } from "@/lib/http-error";
import { ViewDetail } from "./view-detail";
vi.mock("react-i18next", async (original) => ({
  ...(await original<object>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/components/common/workspace-layout", () => ({
  default: ({
    children,
    headerActions,
  }: {
    children: ReactNode;
    headerActions?: ReactNode;
  }) => (
    <main>
      {headerActions}
      {children}
    </main>
  ),
}));
vi.mock("@/components/page-title", () => ({ default: () => null }));
vi.mock("../planning/queries", () => ({ usePlanningEnabled: () => true }));
vi.mock("./favorite-button", () => ({ FavoriteButton: () => null }));
vi.mock("./save-view-dialog", () => ({ SaveViewDialog: () => null }));
vi.mock("./issues-browser", () => ({
  IssuesBrowser: () => <p>Previously readable issues</p>,
}));
vi.mock("@/fetchers/parity/views", () => ({
  getSavedView: vi.fn(),
  deleteView: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it.each([403, 404, 500])(
  "hides saved-view issues and edit actions after a failed refresh (%s)",
  async (status) => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    const key = ["parity", "view", "w", "v"];
    client.setQueryData(key, {
      id: "v",
      workspaceId: "w",
      name: "Private queue",
      canEdit: true,
    });
    render(
      <QueryClientProvider client={client}>
        <ViewDetail workspaceId="w" viewId="v" />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Previously readable issues")).toBeVisible();
    vi.mocked(getSavedView).mockRejectedValue(
      new HttpError(status, "Access failed"),
    );
    await act(async () => {
      await client.invalidateQueries({ queryKey: key });
    });
    await waitFor(() =>
      expect(
        screen.queryByText("Previously readable issues"),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: "parity:views.edit" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Access failed");
  },
);
