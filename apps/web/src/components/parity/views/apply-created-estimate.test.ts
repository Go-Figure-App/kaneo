import { beforeEach, expect, it, vi } from "vite-plus/test";
const update = vi.hoisted(() => vi.fn());
const warning = vi.hoisted(() => vi.fn());
vi.mock("@/fetchers/parity/cycles", () => ({ updateTaskEstimate: update }));
vi.mock("@/lib/toast", () => ({ toast: { warning } }));
vi.mock("@/lib/i18n", () => ({ i18n: { t: (key: string) => key } }));
import { applyCreatedEstimate } from "./apply-created-estimate";
beforeEach(() => {
  update.mockReset();
  warning.mockReset();
});
it("reports a partial failure without throwing back into the task-creation retry path", async () => {
  update.mockRejectedValueOnce(new Error("Connection lost"));
  await expect(
    applyCreatedEstimate("created", 3, false),
  ).resolves.toBeUndefined();
  expect(update).toHaveBeenCalledExactlyOnceWith("created", 3);
  expect(warning).toHaveBeenCalledWith("parity:views.templateEstimateError");
});
it("does not send a second estimate request for atomic triage creation or unset defaults", async () => {
  await applyCreatedEstimate("pending", 3, true);
  await applyCreatedEstimate("unset", null, false);
  expect(update).not.toHaveBeenCalled();
});
