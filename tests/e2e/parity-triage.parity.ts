import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("triage intake, concurrent inbox updates and all four decisions work", async ({
  page,
  context,
  baseURL,
  browser,
}) => {
  if (!baseURL) throw new Error("A local baseURL is required");
  const headers = { Origin: new URL(baseURL).origin };
  const post = async (path: string, data: object) => {
    const response = await page.request.post(`/api/${path}`, { data, headers });
    await expect(response).toBeOK();
    return response.json();
  };
  const suffix = randomUUID();
  await post("auth/sign-up/email", {
    name: "Triage Tester",
    email: `triage-${suffix}@example.com`,
    password: `Triage-test-${suffix}`,
  });
  const workspace = await post("auth/organization/create", {
    name: "Triage team",
    slug: `triage-${suffix}`,
  });
  await post("auth/organization/set-active", { organizationId: workspace.id });
  const project = await post("project", {
    workspaceId: workspace.id,
    name: "Reports",
    icon: "Layout",
    slug: "RPT",
  });
  await page.goto(`/dashboard/settings/projects/${project.id}/triage`);
  await page
    .getByRole("checkbox", { name: "Enable triage", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Enable triage", exact: true }),
  ).toBeChecked();
  const intake = page.getByRole("textbox", {
    name: "Intake link",
    exact: true,
  });
  await expect(intake).not.toHaveValue("");
  const intakeUrl = await intake.inputValue();
  const anonymous = await browser.newContext();
  const report = await anonymous.newPage();
  await report.goto(intakeUrl);
  await report
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Anonymous intake report");
  await report
    .getByRole("textbox", { name: "Description", exact: true })
    .fill("Please review this incoming report.");
  await report
    .getByRole("textbox", { name: "Email", exact: true })
    .fill("reporter@example.com");
  await report
    .getByRole("button", { name: "Send to triage", exact: true })
    .click();
  await expect(report.getByRole("status")).toHaveText("Submission received");
  const inbox = `/dashboard/workspace/${workspace.id}/triage`;
  await page.goto(inbox);
  await page.getByRole("button", { name: /Anonymous intake report/ }).click();
  const second = await context.newPage();
  await second.goto(inbox);
  await expect(
    second.getByRole("button", { name: /Anonymous intake report/ }),
  ).toBeVisible();
  // Character shortcuts are scoped to the action bar for speech-input safety.
  await page.keyboard.press("1");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  async function openDecision(key: string) {
    await page.getByRole("button", { name: /^Accept/ }).focus();
    await page.keyboard.press(key);
  }
  await openDecision("1");
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Accept", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Anonymous intake report/ }),
  ).toHaveCount(0);
  await expect(
    second.getByRole("button", { name: /Anonymous intake report/ }),
  ).toHaveCount(0);
  const accepted = await page.request.get(`/api/task/tasks/${project.id}`);
  const board = await accepted.json();
  expect(
    board.data.columns.flatMap(
      (column: { tasks: { title: string }[] }) => column.tasks,
    ),
  ).toContainEqual(
    expect.objectContaining({ title: "Anonymous intake report" }),
  );

  async function create(title: string) {
    await page
      .getByRole("button", { name: "New triage item", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("textbox", { name: "Title", exact: true })
      .fill(title);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Send to triage", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: new RegExp(title) }).click();
  }
  await create("Duplicate report");
  await openDecision("2");
  await page
    .getByRole("dialog")
    .getByRole("searchbox", { name: "Original task", exact: true })
    .fill("Anonymous intake report");
  await page.getByRole("dialog").getByRole("radio").first().check();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Mark as duplicate", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Duplicate report/ }),
  ).toHaveCount(0);

  await create("Declined report");
  await openDecision("3");
  const decline = page.getByRole("dialog");
  await expect(
    decline.getByRole("button", { name: "Decline", exact: true }),
  ).toBeDisabled();
  await decline
    .getByRole("textbox", { name: "Reason for declining", exact: true })
    .fill("Already covered by our existing project.");
  await decline.getByRole("button", { name: "Decline", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Declined report/ }),
  ).toHaveCount(0);

  await create("Snoozed report");
  await openDecision("h");
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 16);
  await page
    .getByRole("dialog")
    .getByLabel("Snooze until", { exact: true })
    .fill(tomorrow);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Snooze", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Snoozed report/ }),
  ).toHaveCount(0);

  await page.goto(`/dashboard/settings/projects/${project.id}/triage`);
  await page
    .getByRole("button", { name: "Rotate intake link", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Intake link", exact: true }),
  ).not.toHaveValue(intakeUrl);
  await report.reload();
  await report
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Revoked intake");
  await report
    .getByRole("textbox", { name: "Email", exact: true })
    .fill("reporter@example.com");
  await report
    .getByRole("button", { name: "Send to triage", exact: true })
    .click();
  await expect(report.getByRole("alert")).toContainText("unavailable");
  await second.close();
  await anonymous.close();
});
