import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("cycle settings, task properties, filters and bulk edits stay in sync", async ({
  page,
  context,
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
  const suffix = randomUUID();
  await post("auth/sign-up/email", {
    name: "Cycle Tester",
    email: `cycle-${suffix}@example.com`,
    password: `Cycle-test-${suffix}`,
  });
  const workspace = await post("auth/organization/create", {
    name: "Cycle team",
    slug: `cycle-${suffix}`,
  });
  await post("auth/organization/set-active", { organizationId: workspace.id });
  const project = await post("project", {
    workspaceId: workspace.id,
    name: "Cycle launch",
    slug: "CYC",
    icon: "Flag",
  });
  const columnResponse = await page.request.get(`/api/column/${project.id}`);
  await expect(columnResponse).toBeOK();
  const columns: Array<{ slug: string; isFinal: boolean }> =
    await columnResponse.json();
  const task = await post(`task/${project.id}`, {
    title: "Verify cycle planning",
    description: "",
    status: columns.find((column) => !column.isFinal)!.slug,
    priority: "medium",
  });
  const path = `/dashboard/workspace/${workspace.id}`;
  const board = `${path}/project/${project.id}/board`;
  await page.goto(`${path}/cycles`);
  await page
    .getByRole("button", { name: "Cycle settings", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Enable cycles", { exact: true }).check();
  await dialog.getByLabel("Cycle length (weeks)", { exact: true }).fill("1");
  await dialog.getByLabel("Cooldown (weeks)", { exact: true }).fill("0");
  await dialog.getByLabel("Upcoming cycles", { exact: true }).fill("2");
  await dialog
    .getByRole("combobox", { name: "Start day", exact: true })
    .selectOption("1");
  await dialog
    .getByLabel("Time zone", { exact: true })
    .fill("America/New_York");
  await dialog
    .getByRole("combobox", { name: "Estimate scale", exact: true })
    .selectOption("fibonacci");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Cycle 1", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("0 points", { exact: true })).toBeVisible();

  const observer = await context.newPage();
  await observer.goto(`${path}/cycles`);
  await expect(observer.getByText("0 points", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cycle launch", exact: true }).click();
  // Visit the task through the board so returning to Cycles reuses its cache.
  await expect(page).toHaveURL(new RegExp(`${board}$`));
  await page
    .locator(`[data-task-id="${task.id}"]`)
    .getByText(task.title, { exact: true })
    .click();
  await page.getByRole("button", { name: /^Cycle:/ }).click();
  await page.getByRole("option", { name: /Cycle 1/ }).click();
  await expect(
    page.getByRole("button", { name: "Cycle: Cycle 1", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Estimate:/ }).click();
  await page.getByRole("option", { name: "5", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Estimate: 5", exact: true }),
  ).toBeVisible();
  await expect(observer.getByText("5 points", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Cycles", exact: true }).click();
  await expect(page.getByText("5 points", { exact: true })).toBeVisible();
  await expect(page.getByText(task.title, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Cycle launch", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${board}$`));
  const card = page.locator(`[data-task-id="${task.id}"]`);
  await expect(card).toBeVisible();
  await page.getByRole("button", { name: "Cycle filter", exact: true }).click();
  await page.getByRole("option", { name: "No cycle", exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.keyboard.press("Shift+F");
  await expect(card).toBeVisible();
  await page.getByRole("button", { name: "Cycle filter", exact: true }).click();
  await page.getByRole("option", { name: "No cycle", exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.keyboard.press("Alt+Shift+F");
  await expect(card).toBeVisible();
  await page.getByRole("button", { name: "Cycle filter", exact: true }).click();
  await page
    .getByRole("option", { name: "Current cycle", exact: true })
    .click();
  await expect(card).toBeVisible();
  await card
    .getByText(task.title, { exact: true })
    .click({ modifiers: ["ControlOrMeta"] });
  await page.getByRole("button", { name: "Planning", exact: true }).click();
  await dialog
    .getByRole("combobox", { name: "Property", exact: true })
    .selectOption("updateEstimate");
  await dialog
    .getByRole("combobox", { name: "Value", exact: true })
    .selectOption("3");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(observer.getByText("3 points", { exact: true })).toBeVisible();
  await card
    .getByText(task.title, { exact: true })
    .click({ modifiers: ["ControlOrMeta"] });
  await page.getByRole("button", { name: "Planning", exact: true }).click();
  await dialog
    .getByRole("combobox", { name: "Value", exact: true })
    .selectOption("none");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(card).toHaveCount(0);
  await expect(observer.getByText("0 points", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Cycles", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Cycles", exact: true })
    .getByRole("link", { name: "Upcoming", exact: true })
    .click();
  await page
    .getByRole("link")
    .filter({
      has: page.getByRole("heading", { name: "Cycle 2", exact: true }),
    })
    .click();
  await page.getByRole("button", { name: "Edit cycle", exact: true }).click();
  await dialog.getByLabel("Name", { exact: true }).fill("Release cycle");
  const start = await dialog
    .getByLabel("Start date", { exact: true })
    .inputValue();
  // One-day upcoming cycle checks the inclusive UI/exclusive API date conversion.
  await dialog.getByLabel("End date", { exact: true }).fill(start);
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Release cycle", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit cycle", exact: true }).click();
  await expect(dialog.getByLabel("End date", { exact: true })).toHaveValue(
    start,
  );
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await observer.close();
});
