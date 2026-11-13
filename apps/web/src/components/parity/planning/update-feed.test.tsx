import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { UpdateFeed } from "./update-feed";

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/components/activity/comment-editor", () => ({
  default: ({ value, readOnly }: { value: string; readOnly?: boolean }) =>
    readOnly ? (
      <p>{value}</p>
    ) : (
      <textarea aria-label="Update" defaultValue={value} />
    ),
}));
afterEach(cleanup);

it("follows incoming health until the author explicitly selects a draft health", () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  client.setQueryData(["parity", "updates", "project", "project"], {
    pages: [{ items: [], hasMore: false, page: 1, pageSize: 20 }],
    pageParams: [1],
  });
  const view = (health: "on_track" | "at_risk" | "off_track") => (
    <QueryClientProvider client={client}>
      <UpdateFeed
        parentType="project"
        parentId="project"
        canUpdate
        initialHealth={health}
      />
    </QueryClientProvider>
  );
  const { rerender } = render(view("on_track"));
  const health = screen.getByRole("combobox", {
    name: "parity:planning.health",
  });
  expect(health).toHaveValue("on_track");
  rerender(view("off_track"));
  expect(health).toHaveValue("off_track");
  fireEvent.change(health, { target: { value: "at_risk" } });
  rerender(view("on_track"));
  expect(health).toHaveValue("at_risk");
});

it("renders an overlapping page boundary only once", () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  const update = {
    id: "overlap",
    authorName: "Author",
    body: "Unique update body",
    health: "on_track",
    createdAt: "2026-11-13T12:00:00Z",
  };
  client.setQueryData(["parity", "updates", "project", "project"], {
    pages: [
      { items: [update], hasMore: true, page: 1, pageSize: 1 },
      { items: [update], hasMore: false, page: 2, pageSize: 1 },
    ],
    pageParams: [1, 2],
  });
  render(
    <QueryClientProvider client={client}>
      <UpdateFeed
        parentType="project"
        parentId="project"
        canUpdate={false}
        initialHealth="on_track"
      />
    </QueryClientProvider>,
  );
  expect(screen.getAllByText("Unique update body")).toHaveLength(1);
  expect(screen.getAllByRole("article")).toHaveLength(1);
  client.clear();
});
