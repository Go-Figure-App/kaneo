import { expect, it } from "vite-plus/test";
import { publishEvent, subscribeToEvent } from "../../../apps/api/src/events";
import { drainBackgroundWork, trackBackgroundWork } from "./background-work";

it("drains real event handlers and work they start without making publication synchronous", async () => {
  const first = Promise.withResolvers<void>();
  const nested = Promise.withResolvers<void>();
  let finished = false;
  await subscribeToEvent("test.fixture-drain", async () => {
    await first.promise;
    trackBackgroundWork(
      nested.promise.then(() => {
        finished = true;
      }),
    );
  });
  await publishEvent("test.fixture-drain", {});
  expect(finished).toBe(false);
  let drained = false;
  const draining = drainBackgroundWork().then(() => {
    drained = true;
  });
  first.resolve();
  await first.promise;
  expect(drained).toBe(false);
  nested.resolve();
  await draining;
  expect(finished).toBe(true);
});

it("releases rejected background work while preserving the caller's rejection", async () => {
  const work = trackBackgroundWork(
    Promise.reject(new Error("delivery failed")),
  );
  await expect(work).rejects.toThrow("delivery failed");
  await drainBackgroundWork();
});
