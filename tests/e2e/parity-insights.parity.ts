import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("Insights filters, accessible chart data and errors reflect real reporting", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(150_000);
  if (!baseURL) throw new Error("A local baseURL is required");
  const headers = { Origin: new URL(baseURL).origin };
  const post = async (path: string, data: object) => {
    const response = await page.request.post(`/api/${path}`, { headers, data });
    await expect(response).toBeOK();
    return response.json();
  };
  const put = async (path: string, data: object) => {
    const response = await page.request.put(`/api/${path}`, { headers, data });
    await expect(response).toBeOK();
    return response.json();
  };
  const suffix = randomUUID();
  await post("auth/sign-up/email", {
    name: "Insights Tester",
    email: `insights-${suffix}@example.com`,
    password: `Insights-test-${suffix}`,
  });
  const workspace = await post("auth/organization/create", {
    name: "Insights team",
    slug: `insights-${suffix}`,
  });
  await post("auth/organization/set-active", { organizationId: workspace.id });
  const project = await post("project", {
    workspaceId: workspace.id,
    name: "Delivery",
    slug: "DEL",
    icon: "Flag",
  });
  const empty = await post("project", {
    workspaceId: workspace.id,
    name: "Future work",
    slug: "FUT",
    icon: "Flag",
  });
  await put(`parity/cycle/settings/${workspace.id}`, {
    cyclesEnabled: true,
    estimateScale: "fibonacci",
    timeZone: "America/New_York",
  });
  const columnsResponse = await page.request.get(`/api/column/${project.id}`);
  await expect(columnsResponse).toBeOK();
  const columns: Array<{ slug: string; isFinal: boolean }> =
    await columnsResponse.json();
  const task = await post(`task/${project.id}`, {
    title: "Ship reporting",
    description: "",
    status: columns.find((column) => !column.isFinal)!.slug,
    priority: "medium",
  });
  await put(`parity/task/${task.id}/estimate`, { estimate: 5 });
  const cycles = await page.request.get(
    `/api/parity/cycle/${workspace.id}?phase=current`,
  );
  await expect(cycles).toBeOK();
  const current = (await cycles.json()).items[0];
  await put(`parity/task/${task.id}/cycle`, { cycleId: current.id });
  await put(`task/status/${task.id}`, {
    status: columns.find((column) => column.isFinal)!.slug,
  });
  await expect
    .poll(async () => {
      const response = await page.request.get(
        `/api/parity/insights/${workspace.id}?measure=throughput`,
      );
      if (!response.ok()) return -1;
      const data = await response.json();
      return data.rows.reduce(
        (sum: number, row: { value: number }) => sum + row.value,
        0,
      );
    })
    .toBe(1);

  const workspacePath = `/dashboard/workspace/${workspace.id}`;
  await page.goto(`${workspacePath}/insights`);
  await expect(
    page.getByRole("heading", { name: "Insights", exact: true }),
  ).toBeVisible();
  const throughput = page.getByRole("region", {
    name: "Throughput",
    exact: true,
  });
  await expect(throughput.getByRole("application")).toBeVisible();
  await expect(throughput.getByText("Dates in America/New_York")).toBeVisible();
  await throughput.getByText("View data", { exact: true }).click();
  const table = throughput.getByRole("table", { includeHidden: true });
  await expect(table).toBeVisible();
  await expect(
    table.locator("tbody tr").last().locator("td").nth(1),
  ).toHaveText("1");
  await throughput.getByRole("button", { name: "Points", exact: true }).click();
  await expect(
    table.locator("tbody tr").last().locator("td").nth(1),
  ).toHaveText("5");
  await page
    .getByRole("combobox", { name: "Project", exact: true })
    .selectOption(empty.id);
  await expect(
    table.locator("tbody tr").last().locator("td").nth(1),
  ).toHaveText("0");
  await page
    .getByRole("combobox", { name: "Project", exact: true })
    .selectOption(project.id);
  await expect(
    table.locator("tbody tr").last().locator("td").nth(1),
  ).toHaveText("5");
  await page
    .getByRole("combobox", { name: "Cycle", exact: true })
    .selectOption(current.id);
  await expect(
    page
      .getByRole("region", { name: "Velocity", exact: true })
      .getByRole("application"),
  ).toBeVisible();
  await page.getByLabel("From date", { exact: true }).fill("2026-11-20");
  await page.getByLabel("To date", { exact: true }).fill("2026-11-01");
  await expect(page.getByRole("alert")).toContainText(
    "Choose an ordered date range",
  );
  await expect(throughput).toHaveCount(0);
  await page
    .getByRole("button", { name: "Reset filters", exact: true })
    .click();
  await expect(throughput.getByRole("application")).toBeVisible();

  await page.route("**/api/parity/insights/**", async (route) => {
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ message: "Reporting access changed" }),
    });
  });
  await page.reload();
  await expect(throughput.getByRole("alert")).toContainText(
    "Reporting access changed",
  );
  await expect(throughput.locator("svg")).toHaveCount(0);
  await expect(
    throughput.getByRole("table", { includeHidden: true }),
  ).toHaveCount(0);
  await page.unroute("**/api/parity/insights/**");
  await throughput
    .getByRole("button", { name: "Try again", exact: true })
    .click();
  await expect(throughput.getByRole("application")).toBeVisible();
  await page.goto(`${workspacePath}/project/${project.id}/overview`);
  await expect(
    page
      .getByRole("region", { name: "Progress over time", exact: true })
      .getByRole("application"),
  ).toBeVisible();
});
