import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CircleDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { OptionMenu } from "@/components/common/option-menu/option-menu";
import { useCycleOptions } from "./queries";
import type { useProjectCycleFilter } from "./use-project-cycle-filter";

export function ProjectCycleFilter({
  filter,
}: {
  filter: ReturnType<typeof useProjectCycleFilter>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const cycles = useCycleOptions(filter.workspaceId, filter.enabled && open);
  if (!filter.enabled) return null;
  const selected = cycles.items.find((cycle) => cycle.id === filter.value);
  const label =
    filter.value === "current"
      ? t("parity:cycles.currentCycle")
      : filter.value === "none"
        ? t("parity:cycles.noCycle")
        : selected
          ? (selected.name ??
            t("parity:cycles.number", { number: selected.number }))
          : t("parity:cycles.cycle");
  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={filter.value ? "secondary" : "ghost"}
            size="sm"
            aria-label={t("parity:cycles.filter")}
          >
            <CircleDashed className="size-3.5" />
            {label}
            {filter.value && " · 1"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-0">
          <OptionMenu
            label={t("parity:cycles.filter")}
            placeholder={t("parity:cycles.chooseCycle")}
            options={[
              {
                value: "all",
                label: t("parity:cycles.allCycles"),
                selected: !filter.value,
              },
              {
                value: "current",
                label: t("parity:cycles.currentCycle"),
                selected: filter.value === "current",
              },
              {
                value: "none",
                label: t("parity:cycles.noCycle"),
                selected: filter.value === "none",
              },
              ...cycles.items.map((cycle) => ({
                value: cycle.id,
                label:
                  cycle.name ??
                  t("parity:cycles.number", { number: cycle.number }),
                selected: filter.value === cycle.id,
              })),
            ]}
            onSelect={(value) => {
              filter.setValue(value === "all" ? null : value);
              setOpen(false);
            }}
          />
          {cycles.error && (
            <p role="alert" className="p-2 text-xs">
              {cycles.error.message}
              <Button variant="ghost" onClick={() => void cycles.refetch()}>
                {t("parity:cycles.retry")}
              </Button>
            </p>
          )}
          {cycles.hasNextPage && (
            <Button
              variant="ghost"
              disabled={cycles.isFetchingNextPage}
              onClick={() => void cycles.fetchNextPage()}
            >
              {t("parity:cycles.loadMore")}
            </Button>
          )}
        </PopoverContent>
      </Popover>
      {filter.value && filter.query.isPending && (
        <span role="status" className="text-xs">
          {t("parity:planning.loading")}
        </span>
      )}
      {filter.value && filter.query.error && (
        <span role="alert" className="text-xs text-destructive">
          {filter.query.error.message}
          <Button variant="ghost" onClick={() => void filter.query.refetch()}>
            {t("parity:cycles.retry")}
          </Button>
        </span>
      )}
    </div>
  );
}
