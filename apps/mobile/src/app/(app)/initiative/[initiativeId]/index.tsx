import { useLocalSearchParams } from "expo-router";
import { InitiativeDetailScreen } from "@/features/parity/planning/initiative-detail";

export default function InitiativeRoute() {
  const { initiativeId } = useLocalSearchParams<{ initiativeId: string }>();
  return (
    <InitiativeDetailScreen key={initiativeId} initiativeId={initiativeId} />
  );
}
