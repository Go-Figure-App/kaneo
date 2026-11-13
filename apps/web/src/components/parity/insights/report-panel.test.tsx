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
import type { Insights } from "@/fetchers/parity/insights";
import { chartData } from "./chart-data";
import { ReportPanel } from "./report-panel";

const mocks = vi.hoisted(() => ({ enabled: true, fetch: vi.fn() }));
vi.mock("../planning/queries", () => ({
  usePlanningEnabled: () => mocks.enabled,
}));
vi.mock("@/fetchers/parity/insights", () => ({ getInsights: mocks.fetch }));
vi.mock("./report-chart", () => ({
  default: ({ points }: { points: boolean }) => (
    <div data-testid="chart">{points ? "points" : "issues"}</div>
  ),
}));
vi.mock("react-i18next", async (original) => ({
  ...(await original<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (key: string, params?: { zone?: string }) => params?.zone ?? key,
    i18n: { language: "en-US" },
  }),
}));
const report: Insights = {
  measure: "throughput",
  slice: "week",
  from: "2026-11-09",
  to: "2026-11-15",
  timeZone: "America/New_York",
  estimates: true,
  historyAvailable: true,
  partialHistory: false,
  rows: [
    {
      key: "2026-11-09",
      label: null,
      series: "total",
      value: 2,
      points: 5,
      samples: 2,
    },
  ],
};
const query = { measure: "throughput" as const };
const key = ["parity", "insights", "workspace", query];
function mount(
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const element = (
    <QueryClientProvider client={client}>
      <ReportPanel workspaceId="workspace" query={query} />
    </QueryClientProvider>
  );
  return { ...render(element), client, element };
}
beforeEach(() => {
  mocks.enabled = true;
  mocks.fetch.mockReset().mockResolvedValue(report);
});
afterEach(cleanup);

it("pivots series without turning missing or zero estimates into issues", () => {
  const value = {
    ...report,
    rows: [
      { ...report.rows[0]!, series: "created" as const, points: 0 },
      { ...report.rows[0]!, series: "completed" as const, points: null },
    ],
  };
  expect(chartData(value, true).rows).toEqual([
    { key: "2026-11-09", label: null, created: 0, completed: null },
  ]);
  expect(
    chartData({ ...value, measure: "lead-time" }, true).rows[0]?.created,
  ).toBe(2);
});
it("switches back to counts when estimates are disabled and displays the workspace timezone", async () => {
  const { client } = mount();
  expect(await screen.findByTestId("chart")).toHaveTextContent("issues");
  expect(screen.getByText("America/New_York")).toBeVisible();
  fireEvent.click(
    screen.getByRole("button", { name: "parity:insights.points" }),
  );
  expect(screen.getByTestId("chart")).toHaveTextContent("points");
  await act(async () => {
    client.setQueryData(key, {
      ...report,
      estimates: false,
      rows: report.rows.map((row) => ({ ...row, points: null })),
    });
  });
  await waitFor(() =>
    expect(screen.getByTestId("chart")).toHaveTextContent("issues"),
  );
  expect(
    screen.queryByRole("button", { name: "parity:insights.points" }),
  ).toBeNull();
});
it("hides cached charts and tables after access is revoked and recovers through retry", async () => {
  const { client } = mount();
  await screen.findByTestId("chart");
  mocks.fetch.mockRejectedValue(new Error("Access revoked"));
  await act(async () => {
    await client.invalidateQueries({ queryKey: key });
  });
  expect(await screen.findByRole("alert")).toHaveTextContent("Access revoked");
  expect(screen.queryByTestId("chart")).toBeNull();
  expect(screen.queryByRole("table", { hidden: true })).toBeNull();
  mocks.fetch.mockResolvedValue(report);
  fireEvent.click(
    screen.getByRole("button", { name: "parity:planning.retry" }),
  );
  expect(await screen.findByTestId("chart")).toBeVisible();
});
it("does not fetch or reveal a cached report while Insights is disabled", () => {
  mocks.enabled = false;
  const client = new QueryClient();
  client.setQueryData(key, report);
  const { container } = mount(client);
  expect(container).toBeEmptyDOMElement();
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it("distinguishes unavailable history from zero completed work", async () => {
  mocks.fetch.mockResolvedValue({
    ...report,
    historyAvailable: false,
    partialHistory: true,
    rows: [],
  });
  mount();
  expect(await screen.findByText("parity:insights.noData")).toBeVisible();
  expect(screen.getByText("parity:insights.partialHistory")).toBeVisible();
  expect(screen.queryByTestId("chart")).toBeNull();
});
