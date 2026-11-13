import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { CycleDetail } from "@/fetchers/parity/cycles";
import { burndown } from "./chart";

export function BurndownChart({ cycle }: { cycle: CycleDetail }) {
  const { t, i18n } = useTranslation();
  const titleId = useId();
  const chart = burndown(cycle);
  const x = (value: number) => 45 + value * 570;
  const y = (value: number) => 170 - (value / chart.maximum) * 145;
  const points = chart.observed
    .map((row) => `${x(row.x)},${y(row.remaining)}`)
    .join(" ");
  const number = (value: number) =>
    new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(
      value,
    );
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">{t("parity:cycles.burndown")}</h2>
        <span className="text-xs text-muted-foreground">
          {cycle.settings.estimateScale === "none"
            ? t("parity:cycles.tasksRemaining")
            : t("parity:cycles.pointsRemaining")}
        </span>
      </div>
      {!cycle.historyAvailable ? (
        <p className="py-8 text-sm text-muted-foreground">
          {t("parity:cycles.historyUnavailable")}
        </p>
      ) : chart.observed.length === 0 ? (
        <p className="py-8 text-sm text-muted-foreground">
          {t("parity:cycles.historyEmpty")}
        </p>
      ) : (
        <>
          <svg
            viewBox="0 0 640 205"
            className="w-full"
            role="img"
            aria-labelledby={titleId}
          >
            <title id={titleId}>{t("parity:cycles.burndown")}</title>
            {[0, 0.5, 1].map((ratio) => (
              <g key={ratio}>
                <line
                  x1={45}
                  x2={615}
                  y1={y(chart.maximum * ratio)}
                  y2={y(chart.maximum * ratio)}
                  stroke="currentColor"
                  className="text-border"
                />
                <text
                  x={35}
                  y={y(chart.maximum * ratio) + 4}
                  textAnchor="end"
                  fill="currentColor"
                  className="text-[10px] text-muted-foreground"
                >
                  {number(chart.maximum * ratio)}
                </text>
              </g>
            ))}
            <line
              x1={x(0)}
              y1={y(chart.initial)}
              x2={x(1)}
              y2={y(0)}
              stroke="currentColor"
              strokeDasharray="5 5"
              className="text-muted-foreground/40"
            />
            <polyline
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinejoin="round"
              className="text-primary"
            />
            {chart.observed.map((row) => (
              <circle
                key={row.day}
                cx={x(row.x)}
                cy={y(row.remaining)}
                r={3}
                fill="currentColor"
                className="text-primary"
              >
                <title>{`${row.day}: ${number(row.remaining)}`}</title>
              </circle>
            ))}
            <text
              x={45}
              y={195}
              fill="currentColor"
              className="text-[10px] text-muted-foreground"
            >
              {chart.startDay}
            </text>
            <text
              x={615}
              y={195}
              textAnchor="end"
              fill="currentColor"
              className="text-[10px] text-muted-foreground"
            >
              {chart.endDay}
            </text>
          </svg>
          <details className="mt-1 text-xs text-muted-foreground">
            <summary className="cursor-pointer">
              {t("parity:cycles.dailyHistory")}
            </summary>
            <table className="mt-3 w-full text-left">
              <thead>
                <tr>
                  <th>{t("parity:cycles.date")}</th>
                  <th>{t("parity:cycles.scope")}</th>
                  <th>{t("parity:cycles.remaining")}</th>
                </tr>
              </thead>
              <tbody>
                {chart.observed.map((row) => (
                  <tr key={row.day}>
                    <td className="py-1">{row.day}</td>
                    <td>{number(row.scope)}</td>
                    <td>{number(row.remaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}
