import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { DatePickerSheet } from "@/components/pickers";
import { goBack } from "@/components/screen";
import { OptionSheet } from "@/components/sheet";
import { Button, Group, TextField } from "@/components/ui";
import { formatDate, toIsoDay } from "@/lib/format";
import { useMembers } from "@/lib/hooks";
import { useAction } from "@/lib/query";
import { planningApi } from "./api";
import { initiativeStatuses, usePlanningLabels } from "./labels";
import { PlanningProperty } from "./property-row";
import type { Initiative, InitiativeStatus } from "./types";

export function InitiativeForm({
  workspaceId,
  initiative,
}: {
  workspaceId: string;
  initiative?: Initiative;
}) {
  const { t } = useTranslation(["mobile"]);
  const labels = usePlanningLabels();
  const { run, busy } = useAction();
  const [name, setName] = useState(initiative?.name ?? "");
  const [status, setStatus] = useState<InitiativeStatus>(
    initiative?.status ?? "planned",
  );
  const [ownerId, setOwner] = useState(initiative?.ownerId ?? null);
  const [targetDate, setTarget] = useState(initiative?.targetDate ?? null);
  const [picker, setPicker] = useState<"owner" | "status" | "target" | null>(
    null,
  );
  const members = useMembers(workspaceId);
  const close = () => setPicker(null);
  return (
    <View style={{ paddingHorizontal: 20, gap: 20 }}>
      <TextField
        label={t("mobile:parity.planning.name")}
        accessibilityLabel={t("mobile:parity.planning.name")}
        value={name}
        onChangeText={setName}
        maxLength={200}
        editable={!busy}
      />
      <Group style={{ padding: 16 }}>
        <PlanningProperty
          label={t("mobile:parity.planning.status")}
          value={labels.status[status]}
          onPress={() => setPicker("status")}
        />
        <PlanningProperty
          label={t("mobile:parity.planning.owner")}
          value={
            members.data?.find((m) => m.id === ownerId)?.name ??
            (ownerId === initiative?.ownerId ? initiative?.ownerName : null) ??
            t("mobile:parity.planning.noOwner")
          }
          onPress={() => setPicker("owner")}
        />
        <PlanningProperty
          label={t("mobile:parity.planning.targetDate")}
          value={
            targetDate
              ? formatDate(targetDate)
              : t("mobile:parity.planning.noDate")
          }
          onPress={() => setPicker("target")}
        />
      </Group>
      <Button
        label={t("mobile:parity.planning.save")}
        disabled={!name.trim()}
        loading={busy}
        onPress={async () => {
          if (initiative) {
            const result = await run(() =>
              planningApi.updateInitiative(initiative.id, {
                name,
                status,
                targetDate,
                ...(ownerId !== initiative.ownerId ? { ownerId } : {}),
              }),
            );
            if (result) goBack();
          } else {
            const result = await run(() =>
              planningApi.createInitiative(workspaceId, {
                name,
                status,
                targetDate,
                ownerId,
              }),
            );
            if (result)
              router.replace({
                pathname: "/initiative/[initiativeId]",
                params: { initiativeId: result.id },
              });
          }
        }}
      />
      <OptionSheet
        visible={picker === "status"}
        onClose={close}
        title={t("mobile:parity.planning.status")}
        selected={status}
        options={initiativeStatuses.map((value) => ({
          value,
          label: labels.status[value],
        }))}
        onSelect={setStatus}
      />
      <OptionSheet
        visible={picker === "owner"}
        onClose={close}
        title={t("mobile:parity.planning.owner")}
        selected={ownerId}
        searchable
        options={[
          {
            value: null as string | null,
            label: t("mobile:parity.planning.noOwner"),
          },
          ...(members.data ?? []).map((member) => ({
            value: member.id as string | null,
            label: member.name,
          })),
        ]}
        onSelect={setOwner}
      />
      <DatePickerSheet
        visible={picker === "target"}
        onClose={close}
        title={t("mobile:parity.planning.targetDate")}
        value={targetDate}
        onPick={(day) => setTarget(day ? toIsoDay(day) : null)}
      />
    </View>
  );
}
