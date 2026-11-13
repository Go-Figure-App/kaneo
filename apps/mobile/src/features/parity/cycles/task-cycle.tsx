import { useQuery } from "@tanstack/react-query";
import { CircleDashed } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TextInput, View } from "react-native";
import { ErrorState, Loading } from "@/components/screen";
import { Sheet } from "@/components/sheet";
import { Txt } from "@/components/text";
import { Button, Touch } from "@/components/ui";
import { userMessage } from "@/lib/api/client";
import { useAction } from "@/lib/query";
import { useColors } from "@/theme";
import {
  usePlanningEnabled,
  usePlanningPermissions,
} from "../planning/queries";
import { cyclesApi } from "./api";
import { useCycleOptions } from "./queries";

export function TaskCycle({
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
  const [search, setSearch] = useState("");
  const current = useQuery({
    queryKey: ["parity", "task-cycles", taskId, projectId],
    queryFn: () => cyclesApi.task(taskId),
    enabled,
  });
  const options = useCycleOptions(
    workspaceId ?? "",
    enabled && open && Boolean(current.data?.cyclesEnabled),
  );
  if (
    !enabled ||
    (!current.isError &&
      current.data &&
      !current.data.cyclesEnabled &&
      !current.data.cycle)
  )
    return null;
  const cycle = current.isError ? null : current.data?.cycle;
  const name =
    cycle?.name ??
    (cycle
      ? t("mobile:parity.cycles.number", { number: cycle.number })
      : t("mobile:parity.cycles.cycle"));
  const choices = [
    ...(cycle && !options.items.some((item) => item.id === cycle.id)
      ? [cycle]
      : []),
    ...options.items,
  ];
  const error =
    current.error ?? (current.data?.cyclesEnabled ? options.error : null);
  const select = async (cycleId: string | null) => {
    if (busy || !permissions.data?.updateTasks || current.isError) return;
    if (await run(() => cyclesApi.setCycle(taskId, cycleId))) setOpen(false);
  };
  return (
    <>
      <Touch
        accessibilityRole="button"
        accessibilityLabel={`${t("mobile:parity.cycles.cycle")}: ${cycle ? name : t("mobile:parity.cycles.noCycle")}`}
        disabled={busy}
        onPress={() => {
          setSearch("");
          setOpen(true);
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          height: 32,
          paddingHorizontal: 10,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: c.hairline,
          maxWidth: 240,
        }}
      >
        <CircleDashed size={14} color={c.muted} />
        <Txt
          variant="meta"
          weight="medium"
          numberOfLines={1}
          style={{ flexShrink: 1 }}
        >
          {current.isPending
            ? t("mobile:parity.planning.loading")
            : current.isError
              ? t("mobile:parity.planning.retry")
              : name}
        </Txt>
      </Touch>
      <Sheet
        visible={open}
        title={t("mobile:parity.cycles.cycle")}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        <View style={{ padding: 20, gap: 8 }}>
          {current.isPending ? (
            <Loading />
          ) : error ? (
            <ErrorState
              message={userMessage(error)}
              onRetry={() => {
                void current.refetch();
                if (current.data?.cyclesEnabled) void options.refetch();
              }}
            />
          ) : (
            <>
              <TextInput
                accessibilityLabel={t("mobile:parity.cycles.chooseCycle")}
                placeholder={t("mobile:parity.cycles.chooseCycle")}
                placeholderTextColor={c.faint}
                value={search}
                onChangeText={setSearch}
                maxLength={200}
                style={{
                  color: c.ink,
                  backgroundColor: c.fill,
                  borderRadius: 8,
                  padding: 14,
                }}
              />
              <Touch
                accessibilityRole="radio"
                accessibilityState={{ checked: !cycle }}
                disabled={busy || !permissions.data?.updateTasks}
                onPress={() => void select(null)}
                style={{
                  padding: 14,
                  borderRadius: 8,
                  backgroundColor: !cycle ? c.fillStrong : c.fill,
                }}
              >
                <Txt>{t("mobile:parity.cycles.noCycle")}</Txt>
              </Touch>
              {current.data?.cyclesEnabled &&
                choices
                  .filter((item) =>
                    `${item.name ?? ""} ${t("mobile:parity.cycles.number", { number: item.number })}`
                      .toLocaleLowerCase()
                      .includes(search.toLocaleLowerCase()),
                  )
                  .map((item) => (
                    <Touch
                      key={item.id}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: cycle?.id === item.id }}
                      disabled={busy || !permissions.data?.updateTasks}
                      onPress={() => void select(item.id)}
                      style={{
                        padding: 14,
                        borderRadius: 8,
                        backgroundColor:
                          cycle?.id === item.id ? c.fillStrong : c.fill,
                        gap: 4,
                      }}
                    >
                      <Txt>
                        {item.name ??
                          t("mobile:parity.cycles.number", {
                            number: item.number,
                          })}
                      </Txt>
                      {"phase" in item && item.phase === "current" && (
                        <Txt variant="caption" tone="muted">
                          {t("mobile:parity.cycles.current")}
                        </Txt>
                      )}
                    </Touch>
                  ))}
              {current.data?.cyclesEnabled && options.isPending && <Loading />}
              {current.data?.cyclesEnabled && options.hasNextPage && (
                <Button
                  label={t("mobile:parity.cycles.loadMore")}
                  kind="ghost"
                  loading={options.isFetchingNextPage}
                  onPress={() => void options.fetchNextPage()}
                />
              )}
            </>
          )}
        </View>
      </Sheet>
    </>
  );
}
