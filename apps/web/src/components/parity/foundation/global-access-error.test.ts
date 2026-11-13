import { QueryObserver } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { HttpError } from "@/lib/http-error";
import queryClient from "@/query-client";

vi.mock("@sentry/react", () => ({ captureException: vi.fn() }));
afterEach(() => queryClient.clear());

it("keeps an active planning draft when unrelated queries or mutations return 404", async () => {
  const key = ["parity", "project-plan", "project"];
  const plan = { name: "Keep the editing session" };
  queryClient.setQueryData(key, plan);
  const observer = new QueryObserver(queryClient, {
    queryKey: key,
    enabled: false,
  });
  const unsubscribe = observer.subscribe(() => {});
  const error = new HttpError(404, "Unrelated configuration is missing");
  await expect(
    queryClient.fetchQuery({
      queryKey: ["integration-config"],
      queryFn: () => Promise.reject(error),
      retry: false,
    }),
  ).rejects.toBe(error);
  const mutation = queryClient
    .getMutationCache()
    .build(queryClient, { mutationFn: () => Promise.reject(error) });
  await expect(mutation.execute(undefined)).rejects.toBe(error);
  expect(observer.getCurrentResult()).toMatchObject({
    status: "success",
    data: plan,
    error: null,
  });
  unsubscribe();
});

it.each(["query", "mutation"] as const)(
  "clears planning data for a tagged %s access failure",
  async (kind) => {
    const key = ["parity", "project-plan", "project"];
    queryClient.setQueryData(key, { name: "Previously readable" });
    const error = new HttpError(403, "Access revoked");
    const request = () => Promise.reject(error);
    const result =
      kind === "query"
        ? queryClient.fetchQuery({
            queryKey: key,
            queryFn: request,
            retry: false,
          })
        : queryClient
            .getMutationCache()
            .build(queryClient, {
              mutationKey: ["parity"],
              mutationFn: request,
            })
            .execute(undefined);
    await expect(result).rejects.toBe(error);
    expect(queryClient.getQueryData(key)).toBeUndefined();
  },
);
