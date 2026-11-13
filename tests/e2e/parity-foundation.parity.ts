import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("workflow categories persist and update another browser over the user socket", async ({
  page,
  context,
  baseURL,
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
    name: "Parity Tester",
    email: `parity-${suffix}@example.com`,
    password: `Parity-test-${suffix}`,
  });
  const workspace = await post("auth/organization/create", {
    name: "Planning",
    slug: `parity-${suffix}`,
  });
  await post("auth/organization/set-active", { organizationId: workspace.id });
  const flags = await page.request.get("/api/parity/features");
  expect((await flags.json()).features).toContain("foundation");
  const project = await post("project", {
    workspaceId: workspace.id,
    name: "Planning project",
    icon: "Layout",
    slug: "PLAN",
  });
  const url = `/dashboard/settings/projects/${project.id}/workflow`;
  const second = await context.newPage();
  await page.goto(url);
  await second.goto(url);
  const picker = page.getByRole("combobox", {
    name: "Category for In Progress",
    exact: true,
  });
  const otherPicker = second.getByRole("combobox", {
    name: "Category for In Progress",
    exact: true,
  });
  await expect(picker).toHaveValue("started");
  await expect(otherPicker).toHaveValue("started");
  // Wait for the application's actual user socket before the mutation.
  const hint = second.waitForEvent("websocket", {
    predicate: (socket) => socket.url().includes("/api/ws/user"),
  });
  await second.reload();
  const socket = await hint;
  expect(socket?.url()).toContain("/api/ws/user");
  await expect(otherPicker).toHaveValue("started");
  await picker.selectOption("unstarted");
  await expect(otherPicker).toHaveValue("unstarted");
  await page.reload();
  await expect(picker).toHaveValue("unstarted");
  await picker.selectOption("started");
  await expect(otherPicker).toHaveValue("started");
  await second.close();
});
