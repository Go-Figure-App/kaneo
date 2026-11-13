import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

async function fixture(page: Page, baseURL: string | undefined) {
  if (!baseURL) throw new Error("A local baseURL is required");
  const headers = { Origin: new URL(baseURL).origin };
  const post = async (path: string, data: object) => {
    const response = await page.request.post(`/api/${path}`, { headers, data });
    await expect(response).toBeOK();
    return response.json();
  };
  const suffix = randomUUID();
  const user = await post("auth/sign-up/email", {
    name: "Planning Tester",
    email: `planning-${suffix}@example.com`,
    password: `Planning-test-${suffix}`,
  });
  const workspace = await post("auth/organization/create", {
    name: "Planning team",
    slug: `planning-${suffix}`,
  });
  await post("auth/organization/set-active", { organizationId: workspace.id });
  const project = await post("project", {
    workspaceId: workspace.id,
    name: "Launch readiness",
    slug: "PLAN",
    icon: "Flag",
  });
  const response = await page.request.get(`/api/column/${project.id}`);
  await expect(response).toBeOK();
  const columns: Array<{ slug: string; isFinal: boolean }> =
    await response.json();
  const done = await post(`task/${project.id}`, {
    title: "Ready for review",
    description: "",
    status: columns.find((column) => column.isFinal)!.slug,
    priority: "medium",
  });
  await post(`task/${project.id}`, {
    title: "Finish release notes",
    description: "",
    status: columns.find((column) => !column.isFinal)!.slug,
    priority: "low",
  });
  return {
    workspace,
    project,
    done,
    user: user.user,
    post,
    path: `/dashboard/workspace/${workspace.id}`,
  };
}

test("project properties, milestone assignment and status updates stay in sync", async ({
  page,
  context,
  baseURL,
}) => {
  const f = await fixture(page, baseURL);
  const overview = `${f.path}/project/${f.project.id}/overview`;
  await page.goto(overview);
  await expect(
    page.getByRole("heading", { name: "Launch readiness", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("1 of 2 issues completed", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit properties", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("started");
  await dialog
    .getByRole("combobox", { name: "Lead", exact: true })
    .selectOption(f.user.id);
  await dialog.getByLabel("Start date", { exact: true }).fill("2030-01-01");
  await dialog.getByLabel("Target date", { exact: true }).fill("2030-02-01");
  await dialog
    .getByRole("combobox", { name: "Priority", exact: true })
    .selectOption("high");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("Jan 1, 2030", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "New milestone", exact: true })
    .click();
  await dialog.getByLabel("Name", { exact: true }).fill("Feature complete");
  await dialog.getByLabel("Target date", { exact: true }).fill("2030-01-20");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const milestone = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Feature complete", exact: true }),
  });
  await expect(
    milestone.getByText("0 of 0 issues completed", { exact: true }),
  ).toBeVisible();

  const taskPage = await context.newPage();
  await taskPage.goto(`${f.path}/project/${f.project.id}/task/${f.done.id}`);
  const picker = taskPage.getByRole("combobox", {
    name: "Milestone",
    exact: true,
  });
  await picker.selectOption({ label: "Feature complete" });
  await expect(
    milestone.getByText("1 of 1 issues completed", { exact: true }),
  ).toBeVisible();
  await picker.selectOption("");
  await expect(
    milestone.getByText("0 of 0 issues completed", { exact: true }),
  ).toBeVisible();

  await page
    .getByRole("combobox", { name: "Health", exact: true })
    .selectOption("at_risk");
  await page
    .locator('[contenteditable="true"]')
    .fill("Release is waiting for the final verification.");
  await page.getByRole("button", { name: "Post update", exact: true }).click();
  const update = page
    .getByRole("article")
    .filter({ hasText: "Release is waiting for the final verification." });
  await expect(update.getByText("At risk", { exact: true })).toBeVisible();
  await page.reload();
  await expect(update).toBeVisible();
  await page
    .getByRole("button", { name: "Edit properties", exact: true })
    .click();
  await expect(
    dialog.getByRole("combobox", { name: "Lead", exact: true }),
  ).toHaveValue(f.user.id);
  await dialog
    .getByRole("combobox", { name: "Lead", exact: true })
    .selectOption("");
  await dialog.getByLabel("Start date", { exact: true }).fill("");
  await dialog.getByLabel("Target date", { exact: true }).fill("");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const plan = await page.request.get(
    `/api/parity/project-plan/${f.project.id}`,
  );
  expect(await plan.json()).toMatchObject({
    leadId: null,
    startDate: null,
    targetDate: null,
    status: "started",
    health: "at_risk",
  });
  await milestone.getByRole("button", { name: "Delete", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Confirm deletion", exact: true })
    .click();
  await expect(milestone).toHaveCount(0);
  await taskPage.close();
});

test("initiatives link projects, roll up progress, post updates and restore archives", async ({
  page,
  baseURL,
}) => {
  const f = await fixture(page, baseURL);
  await page.goto(`${f.path}/initiatives`);
  await page
    .getByRole("button", { name: "New initiative", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("Launch initiative");
  await dialog
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("active");
  await dialog
    .getByRole("combobox", { name: "Owner", exact: true })
    .selectOption(f.user.id);
  await dialog.getByLabel("Target date", { exact: true }).fill("2030-03-01");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Launch initiative", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("button", { name: "Add project", exact: true })
    .click();
  await dialog
    .getByRole("combobox", { name: "Projects", exact: true })
    .selectOption(f.project.id);
  await dialog
    .getByRole("button", { name: "Add project", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Launch readiness", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("1 of 2 issues completed", { exact: true }),
  ).toHaveCount(2);
  await page
    .getByRole("combobox", { name: "Health", exact: true })
    .selectOption("off_track");
  await page
    .locator('[contenteditable="true"]')
    .fill("Scope needs another review.");
  await page.getByRole("button", { name: "Post update", exact: true }).click();
  await expect(
    page
      .getByRole("article")
      .filter({ hasText: "Scope needs another review." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remove project", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Launch readiness", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("0 of 0 issues completed", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Restore", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Post update", exact: true }),
  ).toHaveCount(0);
  const initiativeUrl = page.url();
  await page.goto(`${f.path}/initiatives`);
  await expect(
    page.getByRole("link", { name: "Launch initiative", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("checkbox", { name: "Show archived", exact: true })
    .check();
  await page
    .getByRole("link", { name: "Launch initiative", exact: true })
    .click();
  await expect(page).toHaveURL(initiativeUrl);
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Archive", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit properties", exact: true })
    .click();
  await expect(
    dialog.getByRole("combobox", { name: "Owner", exact: true }),
  ).toHaveValue(f.user.id);
  await dialog
    .getByRole("combobox", { name: "Owner", exact: true })
    .selectOption("");
  await dialog.getByLabel("Target date", { exact: true }).fill("");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("No owner", { exact: true })).toBeVisible();
});
