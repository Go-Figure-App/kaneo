import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Ellipsis } from "lucide-react-native";
import Swipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { Txt } from "@/components/text";
import { IconButton, Touch } from "@/components/ui";
import { useColors } from "@/theme";
import type { TriageDecision, TriageItem } from "./api";

export function TriageRow({
  item,
  canUpdate,
  onOpen,
  onAction,
}: {
  item: TriageItem;
  canUpdate: boolean;
  onOpen: () => void;
  onAction: (action: TriageDecision["action"] | "menu") => void;
}) {
  const { t } = useTranslation(["mobile"]);
  const c = useColors();
  const swipe = useRef<SwipeableMethods>(null);
  const act = (action: TriageDecision["action"] | "menu") => {
    swipe.current?.close();
    onAction(action);
  };
  return (
    <Swipeable
      ref={swipe}
      enabled={canUpdate}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={() => (
        <Touch
          accessibilityLabel={t("mobile:parity.triage.accept")}
          onPress={() => act("accept")}
          style={{
            width: 92,
            justifyContent: "center",
            backgroundColor: c.primary,
          }}
        >
          <Txt center color={c.onPrimary} weight="medium">
            {t("mobile:parity.triage.accept")}
          </Txt>
        </Touch>
      )}
      renderRightActions={() => (
        <Touch
          accessibilityLabel={t("mobile:parity.triage.title")}
          onPress={() => act("menu")}
          style={{
            width: 104,
            justifyContent: "center",
            backgroundColor: c.fillStrong,
          }}
        >
          <Txt center weight="medium">
            •••
          </Txt>
        </Touch>
      )}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: c.surface,
          borderBottomWidth: 1,
          borderBottomColor: c.divider,
        }}
      >
        <Touch
          onPress={onOpen}
          onLongPress={canUpdate ? () => act("menu") : undefined}
          style={{ flex: 1, padding: 16, gap: 5 }}
        >
          <Txt variant="caption" tone="muted">
            {item.projectSlug.toUpperCase()}-{item.number} · {item.projectName}
          </Txt>
          <Txt variant="bodySm" weight="medium" numberOfLines={3}>
            {item.title}
          </Txt>
        </Touch>
        {canUpdate && (
          <IconButton
            label={t("mobile:parity.triage.title")}
            onPress={() => act("menu")}
          >
            <Ellipsis size={20} color={c.muted} />
          </IconButton>
        )}
      </View>
    </Swipeable>
  );
}
