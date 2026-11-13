import { useQuery } from "@tanstack/react-query";
import { Flag } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { ErrorState, Loading } from "@/components/screen";
import { Sheet } from "@/components/sheet";
import { Txt } from "@/components/text";
import { Touch } from "@/components/ui";
import { userMessage } from "@/lib/api/client";
import { useAction } from "@/lib/query";
import { useColors } from "@/theme";
import { planningApi } from "./api";
import { usePlanningEnabled, usePlanningPermissions } from "./queries";

export function TaskMilestone({
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
  const { run, busy } = useAction("parity");
  const enabled = usePlanningEnabled();
  const permissions = usePlanningPermissions(workspaceId ?? undefined);
  const [open, setOpen] = useState(false);
  const current = useQuery({
    queryKey: ["parity", "milestone", "task", taskId, projectId],
    queryFn: () => planningApi.taskMilestone(taskId),
    enabled,
  });
  const milestones = useQuery({
    queryKey: ["parity", "milestones", projectId],
    queryFn: () => planningApi.milestones(projectId),
    enabled: enabled && open,
  });
  if (!enabled) return null;
  const select = async (id: string | null) => {
    if (await run(() => planningApi.setMilestone(taskId, id))) setOpen(false);
  };
  return (
    <>
      <Touch
        accessibilityRole="button"
        disabled={busy}
        onPress={() => setOpen(true)}
        accessibilityLabel={`${t("mobile:parity.planning.milestone")}: ${current.data?.name ?? t("mobile:parity.planning.noMilestone")}`}
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
        <Flag size={14} color={c.muted} />
        <Txt variant="meta" weight="medium">
          {current.isPending
            ? t("mobile:parity.planning.loading")
            : current.isError
              ? t("mobile:parity.planning.retry")
              : (current.data?.name ?? t("mobile:parity.planning.milestone"))}
        </Txt>
      </Touch>
      <Sheet
        visible={open}
        title={t("mobile:parity.planning.milestone")}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        <View style={{ padding: 20, gap: 8 }}>
          {current.isError ? (
            <ErrorState
              message={userMessage(current.error)}
              onRetry={current.refetch}
            />
          ) : milestones.isPending ? (
            <Loading />
          ) : milestones.isError ? (
            <ErrorState
              message={userMessage(milestones.error)}
              onRetry={milestones.refetch}
            />
          ) : (
            [
              { id: null, name: t("mobile:parity.planning.noMilestone") },
              ...(milestones.data ?? []),
            ].map((item) => (
              <Touch
                key={item.id ?? "none"}
                accessibilityRole="radio"
                accessibilityState={{
                  checked: current.data?.milestoneId === item.id,
                }}
                disabled={busy || !permissions.data?.updateTasks}
                onPress={() => void select(item.id)}
                style={{
                  padding: 14,
                  borderRadius: 8,
                  backgroundColor:
                    current.data?.milestoneId === item.id
                      ? c.fillStrong
                      : c.fill,
                }}
              >
                <Txt>{item.name}</Txt>
              </Touch>
            ))
          )}
        </View>
      </Sheet>
    </>
  );
}
