import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import {
  saveView,
  getWorkspaceTasks,
  type SavedView,
  type ViewFilters,
  type ViewDisplay,
} from "@/fetchers/parity/views";
import { refreshViews } from "./queries";
import { defaultDisplay } from "./display";
import { IssuesBrowser } from "./issues-browser";

vi.mock("react-i18next", async (original) => ({
  ...(await original<object>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("./queries", () => ({
  useViewOptions: () => ({}),
  refreshViews: vi.fn(),
}));
vi.mock("@/fetchers/parity/views", () => ({
  saveView: vi.fn(),
  getWorkspaceTasks: vi.fn(),
}));
vi.mock("./save-view-dialog", () => ({ SaveViewDialog: () => null }));
vi.mock("./task-collection", () => ({ TaskCollection: () => null }));
vi.mock("./filter-builder", () => ({
  FilterBuilder: ({
    filters,
    onChange,
  }: {
    filters: ViewFilters;
    onChange: (value: ViewFilters) => void;
  }) => (
    <>
      <output aria-label="Filters">{JSON.stringify(filters)}</output>
      {["high", "low"].map((priority) => (
        <button
          key={priority}
          onClick={() =>
            onChange([
              {
                field: "priority",
                operator: "is",
                values: [priority as "high"],
              },
            ])
          }
        >
          Filter {priority}
        </button>
      ))}
    </>
  ),
}));
vi.mock("./display-options", () => ({
  DisplayOptions: ({
    value,
    onChange,
  }: {
    value: ViewDisplay;
    onChange: (value: ViewDisplay) => void;
  }) => (
    <select
      aria-label="Layout"
      value={value.layout}
      onChange={(event) =>
        onChange({ ...value, layout: event.target.value as "board" })
      }
    >
      <option value="list">List</option>
      <option value="board">Board</option>
    </select>
  ),
}));

const view: SavedView = {
  id: "v",
  workspaceId: "w",
  ownerId: "u",
  name: "Queue",
  icon: null,
  projectId: null,
  shared: false,
  canEdit: true,
  filters: [{ field: "priority", operator: "is", values: ["urgent"] }],
  display: defaultDisplay,
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const tree = (saved = view, resetVersion = 0) => (
    <QueryClientProvider client={client}>
      <IssuesBrowser workspaceId="w" view={saved} resetVersion={resetVersion} />
    </QueryClientProvider>
  );
  return { tree, ...render(tree()) };
}
beforeEach(() => {
  vi.mocked(getWorkspaceTasks).mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 100,
    hasMore: false,
    timeZone: "UTC",
  });
  vi.mocked(refreshViews).mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it.each(["request", "refresh"])(
  "preserves new filter and display edits while the save %s is pending",
  async (stage) => {
    const request = deferred<SavedView>();
    const refresh = deferred<void>();
    vi.mocked(saveView).mockReturnValue(request.promise);
    vi.mocked(refreshViews).mockReturnValue(refresh.promise);
    setup();
    fireEvent.click(screen.getByText("Filter high"));
    fireEvent.change(screen.getByLabelText("Layout"), {
      target: { value: "board" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "parity:views.saveChanges" }),
    );
    await waitFor(() => expect(saveView).toHaveBeenCalledOnce());
    if (stage === "refresh") {
      await act(async () => request.resolve(view));
      await waitFor(() => expect(refreshViews).toHaveBeenCalledOnce());
    }
    fireEvent.click(screen.getByText("Filter low"));
    fireEvent.change(screen.getByLabelText("Layout"), {
      target: { value: "list" },
    });
    await act(async () => {
      request.resolve(view);
      refresh.resolve();
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "parity:views.saveChanges" }),
      ).toBeEnabled(),
    );
    expect(screen.getByLabelText("Filters")).toHaveTextContent('"low"');
    expect(screen.getByLabelText("Layout")).toHaveValue("list");
    expect(saveView).toHaveBeenCalledWith(
      "w",
      expect.objectContaining({
        filters: [{ field: "priority", operator: "is", values: ["high"] }],
        display: expect.objectContaining({ layout: "board" }),
      }),
      "v",
    );
  },
);

it("keeps drafts across background refreshes and resets them explicitly after a settings edit", () => {
  const { rerender, tree } = setup();
  fireEvent.click(screen.getByText("Filter low"));
  fireEvent.change(screen.getByLabelText("Layout"), {
    target: { value: "board" },
  });
  rerender(tree({ ...view }));
  expect(screen.getByLabelText("Filters")).toHaveTextContent('"low"');
  expect(screen.getByLabelText("Layout")).toHaveValue("board");
  rerender(tree({ ...view, projectId: "another" }, 1));
  expect(screen.getByLabelText("Filters")).toHaveTextContent('"urgent"');
  expect(screen.getByLabelText("Layout")).toHaveValue("list");
});
