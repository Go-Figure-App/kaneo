import { afterEach, expect, it, vi } from "vite-plus/test";
import { deleteTemplate, saveTemplate } from "./views";

vi.mock("@kaneo/libs", async () => {
  const { hc } = await import("hono/client");
  return { client: hc("https://example.test/api") };
});
afterEach(() => vi.restoreAllMocks());

it("keeps reserved characters in template names inside one path segment", async () => {
  const request = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () => Response.json({}));
  const name = "Bug#mobile / 100%?";
  const template = { name, title: "Issue", description: "", defaults: {} };
  await saveTemplate("project", template, name);
  await deleteTemplate("project", name);
  expect(request).toHaveBeenCalledTimes(2);
  for (const [url] of request.mock.calls) {
    const parsed = new URL(String(url));
    expect(parsed.pathname).toBe(
      `/api/parity/templates/project/${encodeURIComponent(name)}`,
    );
    expect(parsed.hash).toBe("");
    expect(parsed.search).toBe("");
  }
  expect(JSON.parse(request.mock.calls[0]![1]!.body as string).name).toBe(name);
});
