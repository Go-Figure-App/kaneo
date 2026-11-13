import { View } from "react-native";
import { Txt } from "@/components/text";
import { useColors } from "@/theme";
import { usePlanningLabels } from "./labels";
import type { Health } from "./types";

export function PlanningHealth({ health }: { health: Health }) {
  const c = useColors();
  const labels = usePlanningLabels();
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
      <View
        style={{
          height: 7,
          width: 7,
          borderRadius: 4,
          backgroundColor:
            health === "off_track"
              ? c.danger
              : health === "at_risk"
                ? c.warning
                : c.success,
        }}
      />
      <Txt variant="meta">{labels.health[health]}</Txt>
    </View>
  );
}
