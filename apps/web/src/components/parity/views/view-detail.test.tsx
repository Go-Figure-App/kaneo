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
import {
  getSavedView,
  type SavedView,
  type SavedViewInput,
} from "@/fetchers/parity/views";
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
vi.mock("./save-view-dialog", () => ({
  SaveViewDialog: ({
    initial,
    onSaved,
    onClose,
  }: {
    initial: SavedViewInput;
    onSaved: (id: string, saved: SavedView, original: SavedViewInput) => void;
    onClose: () => void;
  }) => (
    <>
      <button
        onClick={() => {
          onSaved(
            "v",
            { ...initial, projectId: "changed" } as SavedView,
            initial,
          );
          onClose();
        }}
      >
        Save changed scope
      </button>
      <button
        onClick={() => {
          onSaved("v", { ...initial, name: "Renamed" } as SavedView, initial);
          onClose();
        }}
      >
        Save name
      </button>
    </>
  ),
}));
vi.mock("./issues-browser", () => ({
  IssuesBrowser: ({ resetVersion }: { resetVersion: number }) => (
    <p data-reset-version={resetVersion}>Previously readable issues</p>
  ),
}));
vi.mock("@/fetchers/parity/views", () => ({
  getSavedView: vi.fn(),
  deleteView: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("resets browser drafts after a dialog scope change but preserves them after a rename", () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(["parity", "view", "w", "v"], {
    id: "v",
    workspaceId: "w",
    name: "Queue",
    canEdit: true,
    projectId: null,
    filters: [],
    display: {},
  });
  render(
    <QueryClientProvider client={client}>
      <ViewDetail workspaceId="w" viewId="v" />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "parity:views.edit" }));
  fireEvent.click(screen.getByText("Save name"));
  expect(screen.getByText("Previously readable issues")).toHaveAttribute(
    "data-reset-version",
    "0",
  );
  fireEvent.click(screen.getByRole("button", { name: "parity:views.edit" }));
  fireEvent.click(screen.getByText("Save changed scope"));
  expect(screen.getByText("Previously readable issues")).toHaveAttribute(
    "data-reset-version",
    "1",
  );
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
