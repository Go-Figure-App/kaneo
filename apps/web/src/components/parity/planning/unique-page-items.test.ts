import { expect, it } from "vite-plus/test";
import { uniquePageItems } from "./unique-page-items";

it("keeps the first occurrence in server order when inserts shift page boundaries", () => {
  expect(
    uniquePageItems([
      {
        items: [
          { id: "new", body: "Latest" },
          { id: "shared", body: "Current" },
        ],
      },
      {
        items: [
          { id: "shared", body: "Older snapshot" },
          { id: "last", body: "Last" },
        ],
      },
    ]),
  ).toEqual([
    { id: "new", body: "Latest" },
    { id: "shared", body: "Current" },
    { id: "last", body: "Last" },
  ]);
  expect(uniquePageItems(undefined)).toEqual([]);
});
