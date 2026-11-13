import { expect, it } from "vite-plus/test";
import { estimatePoints, estimateValues, validEstimate } from "./estimates";

it("uses the documented numeric scales, with T-shirt sizes mapped to Fibonacci", () => {
  expect(estimateValues("linear")).toEqual([1, 2, 3, 4, 5]);
  expect(estimateValues("fibonacci")).toEqual([1, 2, 3, 5, 8]);
  expect(estimateValues("t-shirt")).toEqual([1, 2, 3, 5, 8]);
  expect(validEstimate(4, "fibonacci")).toBe(false);
  expect(validEstimate(5, "fibonacci")).toBe(true);
  expect(validEstimate(1, "none")).toBe(false);
  expect(validEstimate(null, "none")).toBe(true);
});
it("counts unestimated issues as one point and preserves imported zero estimates", () => {
  expect(estimatePoints(null, "fibonacci")).toBe(1);
  expect(estimatePoints(0, "fibonacci")).toBe(0);
  expect(estimatePoints(8, "none")).toBe(1);
  expect(estimatePoints(8, "fibonacci")).toBe(8);
});
