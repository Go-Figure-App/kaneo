import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { DatePickerSheet } from "@/components/pickers";
import { goBack } from "@/components/screen";
import { OptionSheet } from "@/components/sheet";
import { Button, Group } from "@/components/ui";
import { formatDate, toIsoDay } from "@/lib/format";
import { useMembers } from "@/lib/hooks";
import { useAction } from "@/lib/query";
import { planningApi } from "./api";
import { priorities, projectStatuses, usePlanningLabels } from "./labels";
import { PlanningProperty } from "./property-row";
import type { ProjectPlan } from "./types";

export function ProjectPlanForm({ project }: { project: ProjectPlan }) {
  const { t } = useTranslation(["mobile"]);
  const labels = usePlanningLabels();
  const { run, busy } = useAction("parity");
  const [picker, setPicker] = useState<
    "status" | "lead" | "start" | "target" | "priority" | null
  >(null);
  const [status, setStatus] = useState(project.status);
  const [selectedLeadId, setLead] = useState<string | null>();
  const leadId = selectedLeadId === undefined ? project.leadId : selectedLeadId;
  const [startDate, setStart] = useState(project.startDate);
  const [targetDate, setTarget] = useState(project.targetDate);
  const [priority, setPriority] = useState(project.priority);
  const members = useMembers(project.workspaceId, project.id);
  const close = () => setPicker(null);
  return (
    <View style={{ paddingHorizontal: 20, gap: 20 }}>
      <Group style={{ padding: 16 }}>
        <PlanningProperty
          label={t("mobile:parity.planning.status")}
          value={labels.status[status]}
          onPress={() => setPicker("status")}
        />
        <PlanningProperty
          label={t("mobile:parity.planning.lead")}
          value={
            members.data?.find((m) => m.id === leadId)?.name ??
            (leadId === project.leadId ? project.leadName : null) ??
            t("mobile:parity.planning.noLead")
          }
          onPress={() => setPicker("lead")}
        />
        <PlanningProperty
          label={t("mobile:parity.planning.startDate")}
          value={
            startDate
              ? formatDate(startDate)
              : t("mobile:parity.planning.noDate")
          }
          onPress={() => setPicker("start")}
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
        <PlanningProperty
          label={t("mobile:parity.planning.priority")}
          value={labels.priority[priority]}
          onPress={() => setPicker("priority")}
        />
      </Group>
      <Button
        label={t("mobile:parity.planning.save")}
        loading={busy}
        onPress={async () => {
          const result = await run(() =>
            planningApi.updateProject(project.id, {
              status,
              startDate,
              targetDate,
              priority,
              ...(selectedLeadId !== undefined ? { leadId } : {}),
            }),
          );
          if (result) goBack();
        }}
      />
      <OptionSheet
        visible={picker === "status"}
        onClose={close}
        title={t("mobile:parity.planning.status")}
        selected={status}
        options={projectStatuses.map((value) => ({
          value,
          label: labels.status[value],
        }))}
        onSelect={setStatus}
      />
      <OptionSheet
        visible={picker === "priority"}
        onClose={close}
        title={t("mobile:parity.planning.priority")}
        selected={priority}
        options={priorities.map((value) => ({
          value,
          label: labels.priority[value],
        }))}
        onSelect={setPriority}
      />
      <OptionSheet
        visible={picker === "lead"}
        onClose={close}
        title={t("mobile:parity.planning.lead")}
        selected={leadId}
        searchable
        options={[
          {
            value: null as string | null,
            label: t("mobile:parity.planning.noLead"),
          },
          ...(members.data ?? []).map((member) => ({
            value: member.id as string | null,
            label: member.name,
          })),
        ]}
        onSelect={setLead}
      />
      <DatePickerSheet
        visible={picker === "start"}
        onClose={close}
        title={t("mobile:parity.planning.startDate")}
        value={startDate}
        onPick={(day) => setStart(day ? toIsoDay(day) : null)}
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
