import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Txt } from "@/components/text";
import { Touch } from "@/components/ui";
import { InboxTab } from "@/features/home/inbox-tab";
import { useColors } from "@/theme";
import { useTriageCount, useTriageEnabled } from "./queries";
import { TriageList } from "./list";

export function PlanningInbox({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation(["mobile"]);
  const c = useColors();
  const enabled = useTriageEnabled();
  const count = useTriageCount(workspaceId);
  const [tab, setTab] = useState<"notifications" | "triage">("notifications");
  if (!enabled) return <InboxTab workspaceId={workspaceId} />;
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: "row",
          margin: 16,
          padding: 4,
          borderRadius: 10,
          backgroundColor: c.fill,
        }}
      >
        {(["notifications", "triage"] as const).map((value) => (
          <Touch
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === value }}
            onPress={() => setTab(value)}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 8,
              backgroundColor: tab === value ? c.surface : "transparent",
            }}
          >
            <Txt center weight="medium" variant="bodySm">
              {value === "notifications"
                ? t("mobile:notificationSettings.title")
                : `${t("mobile:parity.triage.title")} (${count.data?.count ?? 0})`}
            </Txt>
          </Touch>
        ))}
      </View>
      {tab === "notifications" ? (
        <InboxTab workspaceId={workspaceId} />
      ) : (
        <TriageList key={workspaceId} workspaceId={workspaceId} />
      )}
    </View>
  );
}
