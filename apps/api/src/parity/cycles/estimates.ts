export const estimateScales = [
  "none",
  "linear",
  "fibonacci",
  "t-shirt",
] as const;
export type EstimateScale = (typeof estimateScales)[number];

export function estimateValues(scale: EstimateScale): readonly number[] {
  if (scale === "none") return [];
  return scale === "linear" ? [1, 2, 3, 4, 5] : [1, 2, 3, 5, 8];
}
export function validEstimate(value: number | null, scale: EstimateScale) {
  return value === null || estimateValues(scale).includes(value);
}
export function estimatePoints(value: number | null, scale: EstimateScale) {
  return scale === "none" ? 1 : (value ?? 1);
}
