import { useQuery } from "@tanstack/react-query";
import { Diamond } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { ErrorState, Loading } from "@/components/screen";
import { Sheet } from "@/components/sheet";
import { Txt } from "@/components/text";
import { Touch } from "@/components/ui";
import { userMessage } from "@/lib/api/client";
import { currentLocale } from "@/lib/i18n";
import { useAction } from "@/lib/query";
import { useColors } from "@/theme";
import {
  usePlanningEnabled,
  usePlanningPermissions,
} from "../planning/queries";
import { cyclesApi } from "./api";
import { estimateChoices, estimateLabel } from "./estimates";

export function TaskEstimate({
  taskId,
  projectId,
  workspaceId,
}: {
  taskId: string;
  projectId: string;
  workspaceId?: string | null;
}) {
  const { t } = useTranslation(["mobile"]);
  const c = useColors();
  const enabled = usePlanningEnabled("cycles");
  const permissions = usePlanningPermissions(workspaceId ?? undefined);
  const { run, busy } = useAction("parity");
  const [open, setOpen] = useState(false);
  const current = useQuery({
    queryKey: ["parity", "task-cycles", taskId, projectId],
    queryFn: () => cyclesApi.task(taskId),
    enabled,
  });
  if (
    !enabled ||
    (current.data?.estimateScale === "none" && current.data.estimate === null)
  )
    return null;
  const scale = current.data?.estimateScale ?? "none";
  const value = current.data?.estimate;
  const label =
    value == null
      ? t("mobile:parity.cycles.estimate")
      : estimateLabel(value, scale, currentLocale());
  const select = async (estimate: number | null) => {
    if (await run(() => cyclesApi.setEstimate(taskId, estimate)))
      setOpen(false);
  };
  return (
    <>
      <Touch
        accessibilityRole="button"
        disabled={busy}
        onPress={() => setOpen(true)}
        accessibilityLabel={`${t("mobile:parity.cycles.estimate")}: ${value == null ? t("mobile:parity.cycles.noEstimate") : label}`}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          height: 32,
          paddingHorizontal: 10,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: c.hairline,
        }}
      >
        <Diamond size={14} color={c.muted} />
        <Txt variant="meta" weight="medium">
          {current.isPending
            ? t("mobile:parity.planning.loading")
            : current.isError
              ? t("mobile:parity.planning.retry")
              : label}
        </Txt>
      </Touch>
      <Sheet
        visible={open}
        title={t("mobile:parity.cycles.estimate")}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        <View style={{ padding: 20, gap: 8 }}>
          {current.isPending ? (
            <Loading />
          ) : current.isError ? (
            <ErrorState
              message={userMessage(current.error)}
              onRetry={current.refetch}
            />
          ) : (
            [null, ...estimateChoices(scale)].map((estimate) => (
              <Touch
                key={estimate ?? "none"}
                accessibilityRole="radio"
                accessibilityState={{ checked: value === estimate }}
                disabled={busy || !permissions.data?.updateTasks}
                onPress={() => void select(estimate)}
                style={{
                  padding: 14,
                  borderRadius: 8,
                  backgroundColor: value === estimate ? c.fillStrong : c.fill,
                }}
              >
                <Txt>
                  {estimate === null
                    ? t("mobile:parity.cycles.noEstimate")
                    : estimateLabel(estimate, scale, currentLocale())}
                </Txt>
              </Touch>
            ))
          )}
        </View>
      </Sheet>
    </>
  );
}
