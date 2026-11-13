import { QueryCache, QueryClient, QueryObserver } from "@tanstack/react-query";
import { expect, it } from "vite-plus/test";
import { clearParityOnAccessError } from "./access-error";

it.each([403, 404])(
  "clears parity data after an access failure (%s) without clearing unrelated data",
  async (status) => {
    const client = new QueryClient({
      queryCache: new QueryCache({
        onError: (error, query) =>
          clearParityOnAccessError(client, error, query.queryKey),
      }),
    });
    const key = ["parity", "initiatives", "workspace"];
    client.setQueryData(key, ["Previously visible initiative"]);
    client.setQueryData(["unrelated"], "Keep");
    const error = Object.assign(new Error("No access"), { status });
    await expect(
      client.fetchQuery({
        queryKey: key,
        queryFn: () => Promise.reject(error),
        retry: false,
      }),
    ).rejects.toBe(error);
    expect(
      client.getQueryCache().findAll({ queryKey: ["parity"] }),
    ).toHaveLength(0);
    expect(client.getQueryData(["unrelated"])).toBe("Keep");
    client.clear();
  },
);

it("retains cached data for transient failures", () => {
  const client = new QueryClient();
  client.setQueryData(["parity", "project-plan", "id"], "Plan");
  clearParityOnAccessError(
    client,
    Object.assign(new Error("Retry later"), { status: 500 }),
    ["parity"],
  );
  expect(client.getQueryData(["parity", "project-plan", "id"])).toBe("Plan");
  client.clear();
});

it("cancels in-flight reads and retains a retryable error without cached content", async () => {
  const client = new QueryClient();
  const key = ["parity", "project-plan", "id"];
  client.setQueryData(key, "Previously visible");
  client.setQueryData(["parity", "features"], { features: ["projects"] });
  let complete!: (value: string) => void;
  const pending = new Promise<string>((resolve) => {
    complete = resolve;
  });
  const observer = new QueryObserver(client, {
    queryKey: key,
    queryFn: () => pending,
    retry: false,
  });
  const unsubscribe = observer.subscribe(() => {});
  const error = Object.assign(new Error("No access"), { status: 403 });
  clearParityOnAccessError(client, error, key);
  complete("Late response must not reappear");
  await pending;
  await Promise.resolve();
  expect(observer.getCurrentResult()).toMatchObject({
    data: undefined,
    error,
    status: "error",
    fetchStatus: "idle",
  });
  expect(client.getQueryData(key)).toBeUndefined();
  expect(client.getQueryData(["parity", "features"])).toEqual({
    features: ["projects"],
  });
  unsubscribe();
  client.clear();
});

it.each([
  { operationKey: undefined },
  { operationKey: ["unrelated"] },
  { operationKey: ["integration", "configuration"] },
])(
  "ignores access failures from unrelated or untagged operations (%s)",
  ({ operationKey }) => {
    const client = new QueryClient();
    const key = ["parity", "project-plan", "id"];
    client.setQueryData(key, "Keep this plan and its open draft");
    const observer = new QueryObserver(client, {
      queryKey: key,
      enabled: false,
    });
    const unsubscribe = observer.subscribe(() => {});
    for (const status of [403, 404])
      clearParityOnAccessError(
        client,
        Object.assign(new Error("Unrelated failure"), { status }),
        operationKey,
      );
    expect(observer.getCurrentResult()).toMatchObject({
      data: "Keep this plan and its open draft",
      status: "success",
    });
    unsubscribe();
    client.clear();
  },
);
