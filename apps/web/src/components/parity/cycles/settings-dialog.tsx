import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  updateCycleSettings,
  type CycleSettings,
  type CycleSettingsInput,
} from "@/fetchers/parity/cycles";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { refreshPlanning } from "../planning/queries";

export function CycleSettingsDialog({
  settings,
  onClose,
}: {
  settings: CycleSettings;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  const { canManageSettings } = useWorkspacePermission();
  const [draft, setDraft] = useState<CycleSettingsInput>({});
  const current = { ...settings, ...draft };
  const mutation = useMutation({
    mutationKey: ["parity"],
    mutationFn: () => updateCycleSettings(settings.workspaceId, draft),
    onSuccess: async () => {
      await refreshPlanning(client);
      onClose();
    },
  });
  const field = "mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm";
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("parity:cycles.settings")}</DialogTitle>
          <DialogDescription>
            {t("parity:cycles.settingsDescription")}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (canManageSettings() && !mutation.isPending) mutation.mutate();
          }}
        >
          <fieldset
            disabled={mutation.isPending || !canManageSettings()}
            className="space-y-5"
          >
            <label className="flex items-center justify-between gap-3 text-sm font-medium">
              {t("parity:cycles.enabled")}
              <input
                type="checkbox"
                checked={current.cyclesEnabled}
                onChange={(event) =>
                  setDraft({ ...draft, cyclesEnabled: event.target.checked })
                }
              />
            </label>
            {settings.cyclesEnabled && !current.cyclesEnabled && (
              <p className="text-xs text-muted-foreground">
                {t("parity:cycles.disableDescription")}
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              {(["cycleWeeks", "cooldownWeeks", "upcomingCycles"] as const).map(
                (key) => (
                  <label key={key} className="text-xs font-medium">
                    {t(`parity:cycles.${key}`)}
                    <input
                      required
                      type="number"
                      min={key === "cooldownWeeks" ? 0 : 1}
                      max={key === "upcomingCycles" ? 15 : 8}
                      className={field}
                      value={current[key]}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          [key]: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                ),
              )}
              <label className="text-xs font-medium">
                {t("parity:cycles.startDay")}
                <select
                  className={field}
                  value={current.cycleStartDay}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      cycleStartDay: Number(event.target.value),
                    })
                  }
                >
                  {Array.from({ length: 7 }, (_, index) => (
                    <option key={index} value={index}>
                      {new Intl.DateTimeFormat(i18n.language, {
                        weekday: "long",
                        timeZone: "UTC",
                      }).format(new Date(Date.UTC(2023, 0, 1 + index)))}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-xs font-medium">
              {t("parity:cycles.timeZone")}
              <input
                required
                className={field}
                value={current.timeZone}
                onChange={(event) =>
                  setDraft({ ...draft, timeZone: event.target.value })
                }
                list="cycle-time-zones"
                autoComplete="off"
              />
              <datalist id="cycle-time-zones">
                {[
                  ...new Set([
                    settings.timeZone,
                    Intl.DateTimeFormat().resolvedOptions().timeZone,
                    "UTC",
                    "America/New_York",
                    "America/Los_Angeles",
                    "Europe/London",
                    "Europe/Berlin",
                    "Asia/Tokyo",
                    "Australia/Sydney",
                  ]),
                ].map((zone) => (
                  <option key={zone} value={zone} />
                ))}
              </datalist>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={current.autoRollover}
                onChange={(event) =>
                  setDraft({ ...draft, autoRollover: event.target.checked })
                }
              />
              {t("parity:cycles.autoRollover")}
            </label>
            <label className="block text-xs font-medium">
              {t("parity:cycles.estimateScale")}
              <select
                className={field}
                value={current.estimateScale}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    estimateScale: event.target
                      .value as CycleSettings["estimateScale"],
                  })
                }
              >
                <option value="none">{t("parity:cycles.scaleNone")}</option>
                <option value="linear">{t("parity:cycles.scaleLinear")}</option>
                <option value="fibonacci">
                  {t("parity:cycles.scaleFibonacci")}
                </option>
                <option value="t-shirt">
                  {t("parity:cycles.scaleTshirt")}
                </option>
              </select>
            </label>
          </fieldset>
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={mutation.isPending}
              onClick={onClose}
            >
              {t("parity:planning.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !canManageSettings()}
            >
              {t("parity:planning.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
