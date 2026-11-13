import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Txt } from "@/components/text";
import { Switch } from "@/components/ui";
import { triageApi } from "./api";
import { useTriageEnabled } from "./queries";

export function TriageCreateOption({
  workspaceId,
  projectId,
  value,
  onChange,
}: {
  workspaceId: string;
  projectId: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { t } = useTranslation(["mobile"]);
  const enabled = useTriageEnabled();
  const projects = useQuery({
    queryKey: ["parity", "triage", workspaceId, "projects"],
    queryFn: () => triageApi.projects(workspaceId),
    enabled,
  });
  const available =
    enabled &&
    Boolean(projects.data?.some((project) => project.id === projectId));
  useEffect(() => {
    if (projects.isSuccess && !available && value) onChange(false);
  }, [projects.isSuccess, available, value, onChange]);
  if (!available) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 14,
      }}
    >
      <Txt variant="bodySm">{t("mobile:parity.triage.send")}</Txt>
      <View
        accessible
        accessibilityRole="switch"
        accessibilityLabel={t("mobile:parity.triage.send")}
        accessibilityState={{ checked: value }}
      >
        <Switch value={value} onChange={onChange} />
      </View>
    </View>
  );
}
