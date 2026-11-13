import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type {
  TaskFilter,
  ViewFilters,
  ViewOptions,
} from "@/fetchers/parity/views";
import { filterFields } from "./display";
import { FilterValues } from "./filter-values";
function initialFilter(
  field: TaskFilter["field"],
  options?: ViewOptions,
): TaskFilter {
  if (field === "category")
    return { field, operator: "is", values: ["started"] };
  if (field === "priority")
    return { field, operator: "is", values: ["urgent"] };
  if (
    field === "estimate" ||
    field === "due" ||
    field === "created" ||
    field === "completed"
  )
    return { field, operator: "is", value: null };
  return {
    field,
    operator: "is",
    values: [field === "project" ? (options?.projects[0]?.id ?? null) : null],
  };
}
export function FilterBuilder({
  filters,
  onChange,
  options,
}: {
  filters: ViewFilters;
  onChange: (filters: ViewFilters) => void;
  options?: ViewOptions;
}) {
  const { t } = useTranslation();
  const [identity, setIdentity] = useState(() => ({
    filters,
    keys: filters.map(() => crypto.randomUUID()),
  }));
  if (identity.filters !== filters)
    setIdentity({ filters, keys: filters.map(() => crypto.randomUUID()) });
  const change = (next: ViewFilters, keys = identity.keys) => {
    setIdentity({ filters: next, keys });
    onChange(next);
  };
  const update = (index: number, value: TaskFilter) =>
    change(filters.map((filter, i) => (index === i ? value : filter)));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter, index) => (
          <div
            key={identity.keys[index]}
            className="flex max-w-full items-center rounded-md border bg-muted/30 px-1"
          >
            <select
              aria-label={t("parity:views.field")}
              className="h-8 max-w-36 bg-transparent px-1 text-xs font-medium"
              value={filter.field}
              onChange={(event) =>
                update(
                  index,
                  initialFilter(
                    event.target.value as TaskFilter["field"],
                    options,
                  ),
                )
              }
            >
              {filterFields.map((field) => (
                <option key={field} value={field}>
                  {t(`parity:views.filters.${field}`)}
                </option>
              ))}
            </select>
            <select
              aria-label={t("parity:views.operator")}
              className="h-8 bg-transparent text-xs text-muted-foreground"
              value={filter.operator}
              onChange={(event) =>
                update(index, {
                  ...filter,
                  operator: event.target.value,
                } as TaskFilter)
              }
            >
              {("value" in filter
                ? (["is", "is-not", "before", "after"] as const)
                : (["is", "is-not"] as const)
              ).map((operator) => (
                <option key={operator} value={operator}>
                  {filter.field === "estimate" && operator === "before"
                    ? t("parity:views.lessThan")
                    : filter.field === "estimate" && operator === "after"
                      ? t("parity:views.greaterThan")
                      : t(`parity:views.${operator}`)}
                </option>
              ))}
            </select>
            <FilterValues
              filter={filter}
              options={options}
              onChange={(value) => update(index, value)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              aria-label={t("parity:views.removeFilter")}
              onClick={() =>
                change(
                  filters.filter((_, i) => i !== index),
                  identity.keys.filter((_, i) => i !== index),
                )
              }
            >
              <X className="size-3" />
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          disabled={filters.length >= 30}
          onClick={() =>
            change(
              [...filters, initialFilter("category", options)],
              [...identity.keys, crypto.randomUUID()],
            )
          }
        >
          <Plus className="size-3" />
          {t("parity:views.addFilter")}
        </Button>
        {!!filters.length && (
          <Button variant="ghost" size="sm" onClick={() => change([], [])}>
            {t("parity:views.clearFilters")}
          </Button>
        )}
      </div>
      {options?.truncated && (
        <p className="text-xs text-muted-foreground">
          {t("parity:views.optionsTruncated")}
        </p>
      )}
    </div>
  );
}
