import type { Insights } from "@/fetchers/parity/insights";

export const durationMeasure = (measure: Insights["measure"]) =>
  ["lead-time", "cycle-time", "time-in-state", "time-to-triage"].includes(
    measure,
  );
export function chartData(report: Insights, points: boolean) {
  const series = [...new Set(report.rows.map((row) => row.series))];
  const data = new Map<
    string,
    { key: string; label: string | null; [key: string]: string | number | null }
  >();
  for (const row of report.rows) {
    const item = data.get(row.key) ?? { key: row.key, label: row.label };
    item[row.series] =
      points && !durationMeasure(report.measure) ? row.points : row.value;
    data.set(row.key, item);
  }
  return { series, rows: [...data.values()] };
}
