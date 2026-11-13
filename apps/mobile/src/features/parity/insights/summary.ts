import type { InsightReport } from "./api";

export function insightValue(
  report: InsightReport | undefined,
  series: string,
  points = false,
) {
  if (!report?.historyAvailable) return null;
  const rows = report.rows.filter((row) => row.series === series);
  if (!rows.length) return null;
  if (points && rows.some((row) => row.points === null)) return null;
  return rows.reduce((sum, row) => sum + (points ? row.points! : row.value), 0);
}
export function throughputBars(report: InsightReport) {
  const rows = report.rows.filter((row) => row.series === "total");
  const maximum = Math.max(1, ...rows.map((row) => row.value));
  return rows.map((row, index) => ({
    day: row.key,
    value: row.value,
    x: 8 + (index * 284) / Math.max(1, rows.length),
    width: Math.max(2, 284 / Math.max(1, rows.length) - 8),
    height: (row.value / maximum) * 50,
  }));
}
