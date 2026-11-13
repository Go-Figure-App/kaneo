import type { EstimateScale } from "./types";
const shirts: Record<number, string> = {
  1: "XS",
  2: "S",
  3: "M",
  5: "L",
  8: "XL",
};
export function estimateChoices(scale: EstimateScale) {
  return scale === "none"
    ? []
    : scale === "linear"
      ? [1, 2, 3, 4, 5]
      : [1, 2, 3, 5, 8];
}
export function estimateLabel(
  value: number,
  scale: EstimateScale,
  locale: string,
) {
  return scale === "t-shirt" && shirts[value]
    ? shirts[value]
    : new Intl.NumberFormat(locale).format(value);
}
