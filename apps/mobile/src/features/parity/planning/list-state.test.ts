import { expect, it } from "vite-plus/test";
import { planningListState } from "./list-state";

const data = {
  pages: [{ items: [{ id: "visible", name: "Loaded initiative" }] }],
};

it.each([401, 403, 404])(
  "hides retained pages on access errors (%s) without claiming an empty workspace",
  (status) => {
    expect(
      planningListState({
        data,
        isSuccess: false,
        error: Object.assign(new Error("No access"), { status }),
      }),
    ).toEqual({ items: [], showEmpty: false });
  },
);
it.each([500, undefined])(
  "retains loaded pages through server and network failures (%s)",
  (status) => {
    expect(
      planningListState({
        data,
        isSuccess: false,
        error: Object.assign(new Error("Try again"), { status }),
      }),
    ).toEqual({ items: data.pages[0].items, showEmpty: false });
  },
);
it("shows the empty state only after a successful empty response", () => {
  const empty = { pages: [{ items: [] }] };
  expect(
    planningListState({ data: empty, isSuccess: true, error: null }),
  ).toEqual({ items: [], showEmpty: true });
  expect(
    planningListState({
      data: empty,
      isSuccess: false,
      error: new Error("Offline"),
    }),
  ).toEqual({ items: [], showEmpty: false });
  expect(planningListState({ isSuccess: false, error: null })).toEqual({
    items: [],
    showEmpty: false,
  });
});
