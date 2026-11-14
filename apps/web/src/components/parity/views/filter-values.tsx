import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TaskFilter, ViewOptions } from "@/fetchers/parity/views";
import { getPriorityLabel } from "@/lib/i18n/domain";

export function FilterValues({
  filter,
  options,
  onChange,
}: {
  filter: TaskFilter;
  options?: ViewOptions;
  onChange: (filter: TaskFilter) => void;
}) {
  const { t } = useTranslation();
  if ("value" in filter)
    return (
      <input
        aria-label={t("parity:views.filterValue")}
        className="h-8 rounded border bg-background px-2 text-xs"
        type={filter.field === "estimate" ? "number" : "date"}
        min={filter.field === "estimate" ? 0 : undefined}
        step={filter.field === "estimate" ? 1 : undefined}
        value={filter.value ?? ""}
        onChange={(event) =>
          onChange({
            ...filter,
            value:
              event.target.value === ""
                ? null
                : filter.field === "estimate"
                  ? Number(event.target.value)
                  : event.target.value,
          } as TaskFilter)
        }
      />
    );
  const choices: { value: string | null; name: string }[] =
    filter.field === "state"
      ? (options?.states ?? []).map((item) => ({
          value: item.name,
          name: item.name,
        }))
      : filter.field === "cycle-period"
        ? [{ value: "current", name: t("parity:cycles.currentCycle") }]
        : filter.field === "category"
          ? (
              [
                "backlog",
                "unstarted",
                "started",
                "completed",
                "canceled",
              ] as const
            ).map((value) => ({
              value,
              name: t(`parity:insights.states.${value}`),
            }))
          : filter.field === "priority"
            ? ["no-priority", "low", "medium", "high", "urgent"].map(
                (value) => ({
                  value,
                  name: getPriorityLabel(value),
                }),
              )
            : [
                { value: null, name: t("parity:views.missing") },
                ...(filter.field === "assignee" || filter.field === "creator"
                  ? (options?.users ?? []).map((item) => ({
                      value: item.id,
                      name: item.name,
                    }))
                  : filter.field === "initiative"
                    ? (options?.initiatives ?? []).map((item) => ({
                        value: item.id,
                        name: item.name,
                      }))
                    : filter.field === "project"
                      ? (options?.projects ?? []).map((item) => ({
                          value: item.id,
                          name: item.name,
                        }))
                      : filter.field === "cycle"
                        ? (options?.cycles ?? []).map((item) => ({
                            value: item.id,
                            name: item.name ?? String(item.number),
                          }))
                        : filter.field === "milestone"
                          ? (options?.milestones ?? []).map((item) => ({
                              value: item.id,
                              name: `${item.projectName} · ${item.name}`,
                            }))
                          : (options?.labels ?? []).map((item) => ({
                              value: item.name,
                              name: item.name,
                            }))),
              ];
  const selected = filter.values as (string | null)[];
  for (const value of selected)
    if (!choices.some((choice) => choice.value === value))
      choices.push({
        value,
        name:
          filter.field === "state" && value !== null
            ? value
            : t("parity:views.unknown"),
      });
  const label =
    choices
      .filter((choice) => selected.includes(choice.value))
      .map((choice) => choice.name)
      .join(", ") || t("parity:views.filterValue");
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="max-w-64 truncate"
          aria-label={t("parity:views.filterValue")}
        >
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-72 w-64 overflow-auto p-2">
        {choices.map((choice) => (
          <label
            key={JSON.stringify(choice.value)}
            className="flex cursor-pointer items-center gap-2 rounded p-2 text-sm hover:bg-accent"
          >
            <input
              type="checkbox"
              checked={selected.includes(choice.value)}
              onChange={(event) =>
                onChange({
                  ...filter,
                  values: event.target.checked
                    ? [...selected, choice.value]
                    : selected.filter((value) => value !== choice.value),
                } as TaskFilter)
              }
            />
            <span className="truncate">{choice.name}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}
