import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Insights } from "@/fetchers/parity/insights";
import { chartData, durationMeasure } from "./chart-data";
import { useInsightLabels } from "./labels";

const colors = ["#6366f1", "#14b8a6", "#f59e0b", "#64748b"];
export default function ReportChart({
  report,
  points,
}: {
  report: Insights;
  points: boolean;
}) {
  const labels = useInsightLabels();
  const chart = chartData(report, points);
  const data = chart.rows.map((row) => ({
    ...row,
    title: labels.key(row.key, row.label, report.slice),
  }));
  const lines =
    durationMeasure(report.measure) ||
    report.measure === "burndown" ||
    report.measure === "created-completed";
  return (
    <div
      className="h-64 min-w-0"
      role="img"
      aria-label={labels.measure(report.measure)}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart
          data={data}
          accessibilityLayer
          margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="title"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            width={48}
            tickFormatter={labels.number}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value) =>
              typeof value === "number"
                ? labels.number(value)
                : String(value ?? "")
            }
            contentStyle={{
              background: "var(--background)",
              borderColor: "var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {chart.series.map((series, index) =>
            lines || series === "average" ? (
              <Line
                key={series}
                name={labels.series(series)}
                dataKey={series}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                strokeDasharray={
                  series === "ideal" || series === "average" ? "5 4" : undefined
                }
                dot={{ r: 3 }}
                connectNulls={series === "ideal"}
                isAnimationActive={false}
              />
            ) : (
              <Bar
                key={series}
                name={labels.series(series)}
                dataKey={series}
                fill={colors[index % colors.length]}
                radius={[3, 3, 0, 0]}
                maxBarSize={36}
                isAnimationActive={false}
              />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
