import { View } from "react-native";
import { Txt } from "@/components/text";
import { Touch } from "@/components/ui";

export function PlanningProperty({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        minHeight: 44,
      }}
    >
      <Txt variant="bodySm" tone="muted">
        {label}
      </Txt>
      <Txt variant="bodySm" style={{ flexShrink: 1, textAlign: "right" }}>
        {value}
      </Txt>
    </View>
  );
  return onPress ? (
    <Touch
      accessibilityRole="button"
      onPress={onPress}
      accessibilityLabel={`${label}: ${value}`}
    >
      {content}
    </Touch>
  ) : (
    content
  );
}
