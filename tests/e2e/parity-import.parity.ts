import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("Linear project import preserves planning data and searchable original identifiers", async ({
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
  const suffix = randomUUID();
  await post("auth/sign-up/email", {
    name: "Import Tester",
    email: `import-${suffix}@example.com`,
    password: `Import-test-${suffix}`,
  });
  const workspace = await post("auth/organization/create", {
    name: "Import team",
    slug: `import-${suffix}`,
  });
  await post("auth/organization/set-active", { organizationId: workspace.id });
  await post("project", {
    workspaceId: workspace.id,
    name: "Setup",
    slug: "SET",
    icon: "Folder",
  });
  await page.goto("/dashboard/settings/workspace/import?source=linear");
  await expect(
    page.getByText(/Each Linear project becomes a new project/),
  ).toBeVisible();
  await page
    .getByLabel("Personal API key", { exact: true })
    .fill("linear-browser-fixture");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Projects", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Engineering — No project", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Select all", exact: true }).click();
  await page
    .getByRole("button", { name: "Import 3 projects", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Import finished", exact: true }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByText("All 3 projects imported.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open Launch", exact: true }),
  ).toBeVisible();
  const runUrl = page.url();
  await page.reload();
  await expect(
    page.getByText("All 3 projects imported.", { exact: true }),
  ).toBeVisible();
  await page.route("**/api/import/runs/**", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    if (body.run) {
      body.run.status = "failed";
      body.run.error = "Synthetic relationship linking failure";
    }
    await route.fulfill({ response, json: body });
  });
  await page.reload();
  await expect(page.getByRole("alert")).toHaveText(
    "Synthetic relationship linking failure",
  );
  await page.unroute("**/api/import/runs/**");
  await page.reload();
  const base = `/dashboard/workspace/${workspace.id}`;
  await page.goto(`${base}/issues`);
  await page
    .getByRole("textbox", { name: "Search issues", exact: true })
    .fill("ENG-42");
  await expect(page.getByRole("link", { name: /Issue 42/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Issue 44/ })).toHaveCount(0);
  await page.getByRole("link", { name: /Issue 42/ }).click();
  await expect(
    page.getByText("Original description", { exact: false }).first(),
  ).toBeVisible();
  await page.goto(`${base}/initiatives`);
  await expect(
    page.getByText("Delivery", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("Future", { exact: true }).first()).toBeVisible();
  await page.goto(`${base}/triage`);
  await expect(
    page.getByText("Issue 44", { exact: true }).first(),
  ).toBeVisible();
  await page.goto(runUrl);
  await page.getByRole("link", { name: "Open Launch", exact: true }).click();
  await expect(
    page.getByText("Issue 42", { exact: true }).first(),
  ).toBeVisible();
});
