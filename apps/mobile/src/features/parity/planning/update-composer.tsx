import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Sheet } from "@/components/sheet";
import { Txt } from "@/components/text";
import { Button, TextField, Touch } from "@/components/ui";
import { useAction } from "@/lib/query";
import { useColors } from "@/theme";
import { planningApi } from "./api";
import { healthValues, usePlanningLabels } from "./labels";
import type { Health, ParentType } from "./types";

export function UpdateComposer({
  kind,
  id,
  health: initialHealth,
  onClose,
}: {
  kind: ParentType;
  id: string;
  health: Health;
  onClose: () => void;
}) {
  const { t } = useTranslation(["mobile"]);
  const labels = usePlanningLabels();
  const c = useColors();
  const { run, busy } = useAction("parity");
  const [health, setHealth] = useState(initialHealth);
  const [body, setBody] = useState("");
  return (
    <Sheet
      visible
      title={t("mobile:parity.planning.postUpdate")}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <View style={{ padding: 20, gap: 16 }}>
        <Txt variant="bodySm">{t("mobile:parity.planning.health")}</Txt>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {healthValues.map((value) => (
            <Touch
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ checked: value === health }}
              disabled={busy}
              onPress={() => setHealth(value)}
              style={{
                padding: 12,
                borderRadius: 8,
                backgroundColor: health === value ? c.fillStrong : c.fill,
              }}
            >
              <Txt variant="bodySm">{labels.health[value]}</Txt>
            </Touch>
          ))}
        </View>
        <TextField
          label={t("mobile:parity.planning.updateBody")}
          accessibilityLabel={t("mobile:parity.planning.updateBody")}
          placeholder={t("mobile:parity.planning.writeUpdate")}
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={50_000}
          editable={!busy}
          style={{ minHeight: 160, textAlignVertical: "top" }}
        />
        <Button
          label={t("mobile:parity.planning.postUpdate")}
          loading={busy}
          disabled={!body.trim() || busy}
          onPress={async () => {
            if (
              await run(() =>
                planningApi.postUpdate(kind, id, { health, body }),
              )
            )
              onClose();
          }}
        />
      </View>
    </Sheet>
  );
}
