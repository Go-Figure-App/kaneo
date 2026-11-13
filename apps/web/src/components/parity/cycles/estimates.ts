import type { TaskCycleProperties } from "@/fetchers/parity/cycles";

type Scale = TaskCycleProperties["estimateScale"];
const shirts: Record<number, string> = {
  1: "XS",
  2: "S",
  3: "M",
  5: "L",
  8: "XL",
};
export function estimateChoices(scale: Scale) {
  return scale === "none"
    ? []
    : scale === "linear"
      ? [1, 2, 3, 4, 5]
      : [1, 2, 3, 5, 8];
}
export function estimateLabel(value: number, scale: Scale, locale: string) {
  return scale === "t-shirt" && shirts[value]
    ? shirts[value]
    : new Intl.NumberFormat(locale).format(value);
}
