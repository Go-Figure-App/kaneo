import { randomUUID } from "node:crypto";
import { expect, test, type Locator } from "@playwright/test";

test("roadmap moves, resizes and schedules projects, drags milestones and updates another tab", async ({
  page,
  context,
  baseURL,
}) => {
  const headers = { Origin: new URL(baseURL!).origin };
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
    name: "Roadmap Tester",
    email: `roadmap-${suffix}@example.com`,
    password: `Roadmap-test-${suffix}`,
  });
  const workspace = await post("auth/organization/create", {
    name: "Roadmap team",
    slug: `roadmap-${suffix}`,
  });
  await post("auth/organization/set-active", { organizationId: workspace.id });
  const project = await post("project", {
    workspaceId: workspace.id,
    name: "Roadmap launch",
    slug: "ROAD",
    icon: "Flag",
  });
  const unscheduled = await post("project", {
    workspaceId: workspace.id,
    name: "Future roadmap",
    slug: "NEXT",
    icon: "Flag",
  });
  await put(`parity/project-plan/${project.id}`, {
    startDate: "2026-11-10",
    targetDate: "2026-11-20",
    status: "started",
  });
  const milestone = await post(`parity/milestone/${project.id}`, {
    name: "Roadmap beta",
    targetDate: "2026-11-15",
  });
  const initiative = await post(`parity/initiative/${workspace.id}`, {
    name: "Roadmap direction",
  });
  await post(
    `parity/initiative/item/${initiative.id}/project/${project.id}`,
    {},
  );
  const path = `/dashboard/workspace/${workspace.id}/roadmap`;
  await page.goto(path);
  await page
    .getByRole("combobox", { name: "Timeline zoom" })
    .selectOption("month");
  await page.getByLabel("Jump to date").fill("2026-11-15");
  const second = await context.newPage();
  await second.goto(path);
  await second.getByLabel("Jump to date").fill("2026-11-15");
  const readPlan = async (id: string) =>
    (await page.request.get(`/api/parity/project-plan/${id}`)).json();
  const drag = async (
    target: Locator,
    pixels: number,
    during?: () => Promise<void>,
  ) => {
    await expect(target).toBeEnabled();
    await target.click({ trial: true });
    await target.scrollIntoViewIfNeeded();
    const box = (await target.boundingBox())!;
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await during?.();
    await page.mouse.move(x + pixels, y, { steps: 8 });
    await page.mouse.up();
  };
  const bar = page.getByRole("button", {
    name: "Move Roadmap launch",
    exact: true,
  });
  await drag(bar, 72);
  await expect
    .poll(() => readPlan(project.id))
    .toMatchObject({ startDate: "2026-11-12", targetDate: "2026-11-22" });
  await expect(
    second.getByRole("button", { name: "Move Roadmap launch", exact: true }),
  ).toHaveAttribute("title", /2026-11-12.*2026-11-22/);
  await drag(
    page.getByRole("button", {
      name: "Resize target of Roadmap launch",
      exact: true,
    }),
    36,
  );
  await expect
    .poll(() => readPlan(project.id))
    .toMatchObject({ targetDate: "2026-11-23" });
  await page
    .getByRole("button", {
      name: "Resize start of Roadmap launch",
      exact: true,
    })
    .press("ArrowLeft");
  await expect
    .poll(() => readPlan(project.id))
    .toMatchObject({ startDate: "2026-11-11" });
  await drag(
    page.getByRole("button", {
      name: "Move milestone Roadmap beta",
      exact: true,
    }),
    36,
  );
  await expect
    .poll(
      async () =>
        (await readPlan(project.id)).milestones.find(
          (item: { id: string }) => item.id === milestone.id,
        ).targetDate,
    )
    .toBe("2026-11-16");

  const timeline = page.getByRole("region", { name: "Project timeline" });
  await timeline.evaluate((element) => {
    element.scrollLeft = 0;
  });
  const card = page
    .getByRole("complementary", { name: "Unscheduled" })
    .getByRole("article")
    .filter({ hasText: "Future roadmap" });
  await card.dragTo(page.getByTestId("roadmap-drop-zone"), {
    targetPosition: { x: 36, y: 20 },
  });
  await expect
    .poll(() => readPlan(unscheduled.id))
    .toMatchObject({ startDate: "2026-11-02", targetDate: "2026-11-08" });
  await expect(
    page.getByRole("complementary", { name: "Unscheduled" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "No initiative", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("started");
  await expect(
    page.getByRole("link", { name: "Future roadmap", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit dates for Future roadmap", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Start date", { exact: true }).fill("");
  await dialog.getByLabel("Target date", { exact: true }).fill("");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("complementary", { name: "Unscheduled" }),
  ).toContainText("Future roadmap");
  await expect
    .poll(() => readPlan(unscheduled.id))
    .toMatchObject({ startDate: null, targetDate: null });

  // Keep the complete weekly grid in view while dragging outside its bounds.
  await page.setViewportSize({ width: 2000, height: 1000 });
  await page
    .getByRole("combobox", { name: "Timeline zoom" })
    .selectOption("week");
  await page.getByLabel("Jump to date").fill("2026-11-12");
  await put(`parity/project-plan/${project.id}`, {
    startDate: "2026-11-10",
    targetDate: "2026-11-14",
  });
  await expect(bar).toHaveAttribute("title", /2026-11-10.*2026-11-14/);
  await drag(bar, 112, async () => {
    await put(`parity/project-plan/${project.id}`, {
      startDate: "2026-11-11",
      targetDate: "2026-11-15",
    });
    await expect(bar).toHaveAttribute("title", /2026-11-11.*2026-11-15/);
  });
  await expect
    .poll(() => readPlan(project.id))
    .toMatchObject({
      startDate: "2026-11-12",
      targetDate: "2026-11-16",
    });
  await put(`parity/project-plan/${project.id}`, {
    startDate: "2026-11-10",
    targetDate: "2026-11-14",
  });
  await expect(bar).toHaveAttribute("title", /2026-11-10.*2026-11-14/);
  await drag(
    page.getByRole("button", {
      name: "Resize start of Roadmap launch",
      exact: true,
    }),
    -224,
  );
  await expect
    .poll(() => readPlan(project.id))
    .toMatchObject({ startDate: "2026-11-08" });
  await drag(
    page.getByRole("button", {
      name: "Resize target of Roadmap launch",
      exact: true,
    }),
    224,
  );
  await expect
    .poll(() => readPlan(project.id))
    .toMatchObject({ targetDate: "2026-11-16" });
  await drag(bar, 896);
  await expect
    .poll(() => readPlan(project.id))
    .toMatchObject({
      startDate: "2026-11-16",
      targetDate: "2026-11-24",
    });
  await expect(bar).toHaveCount(0);
  const marker = page.getByRole("button", {
    name: "Move milestone Roadmap beta",
    exact: true,
  });
  await put(`parity/milestone/item/${milestone.id}`, {
    targetDate: "2026-11-12",
  });
  await expect(marker).toHaveAttribute("title", /2026-11-12/);
  await drag(marker, 112, async () => {
    await put(`parity/milestone/item/${milestone.id}`, {
      targetDate: "2026-11-13",
    });
    await expect(marker).toHaveAttribute("title", /2026-11-13/);
  });
  await expect(marker).toHaveAttribute("title", /2026-11-14/);
  await drag(marker, 224);
  await expect(marker).toHaveCount(0);
  await page.getByRole("button", { name: "Next period", exact: true }).click();
  await expect(marker).toHaveAttribute("title", /2026-11-16/);
  await expect(bar).toHaveAttribute("title", /2026-11-16.*2026-11-24/);
  await second.close();
});
