import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("workspace filters, saved display, favorites and template creation work together", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(180_000);
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
    name: "Views Tester",
    email: `views-${suffix}@example.com`,
    password: `Views-test-${suffix}`,
  });
  const workspace = await post("auth/organization/create", {
    name: "Views team",
    slug: `views-${suffix}`,
  });
  await post("auth/organization/set-active", { organizationId: workspace.id });
  const project = await post("project", {
    workspaceId: workspace.id,
    name: "Delivery",
    slug: "DEL",
    icon: "Flag",
  });
  const columnsResponse = await page.request.get(`/api/column/${project.id}`);
  await expect(columnsResponse).toBeOK();
  const columns = await columnsResponse.json();
  const status = columns.find(
    (column: { isFinal: boolean }) => !column.isFinal,
  ).slug;
  await post(`task/${project.id}`, {
    title: "Urgent release",
    description: "",
    status,
    priority: "urgent",
  });
  await post(`task/${project.id}`, {
    title: "Later cleanup",
    description: "",
    status,
    priority: "low",
  });
  await put(`parity/cycle/settings/${workspace.id}`, {
    estimateScale: "fibonacci",
    timeZone: "America/New_York",
  });
  const base = `/dashboard/workspace/${workspace.id}`;
  await page.goto(`${base}/issues`);
  await expect(
    page.getByRole("link", { name: /Urgent release/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Later cleanup/ })).toBeVisible();
  await page.getByRole("button", { name: "Add filter", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Field", exact: true })
    .selectOption("priority");
  await expect(
    page.getByRole("link", { name: /Urgent release/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Later cleanup/ })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Display", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Layout", exact: true })
    .selectOption("board");
  await page
    .getByRole("combobox", { name: "Group by", exact: true })
    .selectOption("priority");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Save view", exact: true }).click();
  const saveDialog = page.getByRole("dialog");
  await saveDialog
    .getByLabel("View name", { exact: true })
    .fill("Urgent delivery");
  await saveDialog.getByLabel("Share with workspace", { exact: true }).check();
  await saveDialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/views\/[^/]+$/);
  const savedUrl = page.url();
  await page
    .getByRole("button", { name: "Add to favorites", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Urgent delivery", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("link", { name: /Urgent release/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Later cleanup/ })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Display", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Layout", exact: true }),
  ).toHaveValue("board");
  await expect(
    page.getByRole("combobox", { name: "Group by", exact: true }),
  ).toHaveValue("priority");
  await page.keyboard.press("Escape");

  await page.goto(`${base}/views/templates`);
  await page
    .getByRole("combobox", { name: "Choose project", exact: true })
    .selectOption(project.id);
  await page.getByRole("button", { name: "New template", exact: true }).click();
  const templateDialog = page.getByRole("dialog");
  await templateDialog
    .getByLabel("Template name", { exact: true })
    .fill("Release checklist");
  await templateDialog
    .getByLabel("Issue title", { exact: true })
    .fill("Prepare release");
  await templateDialog
    .locator('[contenteditable="true"]')
    .fill("Check migration and rollback instructions.");
  await templateDialog
    .getByRole("combobox", { name: "Priority", exact: true })
    .selectOption("high");
  await templateDialog
    .getByRole("combobox", { name: "Estimate", exact: true })
    .selectOption("3");
  await templateDialog
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(templateDialog).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Release checklist", exact: true }),
  ).toBeVisible();
  await page.goto(`${base}/project/${project.id}/board`);
  await expect(page.getByText("Urgent release", { exact: true })).toBeVisible();
  await page.keyboard.press("c");
  const createDialog = page.getByRole("dialog");
  await createDialog
    .getByRole("combobox", { name: "Use template", exact: true })
    .selectOption("Release checklist");
  await expect(createDialog.locator("textarea").first()).toHaveValue(
    "Prepare release",
  );
  await expect(
    createDialog.getByRole("combobox", { name: "Estimate", exact: true }),
  ).toHaveValue("3");
  await expect(createDialog.locator('[contenteditable="true"]')).toContainText(
    "Check migration and rollback instructions.",
  );
  await createDialog
    .getByRole("button", { name: "Create Task", exact: true })
    .click();
  await expect(createDialog).toHaveCount(0);
  await expect
    .poll(async () => {
      const response = await page.request.get(
        `/api/parity/tasks/${workspace.id}?search=Prepare%20release`,
      );
      return (await response.json()).items.map(
        (item: { estimate: number; priority: string }) => ({
          estimate: item.estimate,
          priority: item.priority,
        }),
      );
    })
    .toEqual([{ estimate: 3, priority: "high" }]);
  await page.keyboard.press("g");
  await page.keyboard.press("v");
  await expect(page).toHaveURL(`${baseURL}${base}/views`);
  await page.getByRole("link", { name: /Urgent delivery/ }).click();
  await expect(page).toHaveURL(savedUrl);

  await page.route(`**/api/parity/views/${workspace.id}/*`, (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ error: "Access denied" }),
    }),
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("Access denied");
  await expect(page.getByRole("link", { name: /Urgent release/ })).toHaveCount(
    0,
  );
  await page.unroute(`**/api/parity/views/${workspace.id}/*`);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("link", { name: /Urgent release/ }),
  ).toBeVisible();
});
