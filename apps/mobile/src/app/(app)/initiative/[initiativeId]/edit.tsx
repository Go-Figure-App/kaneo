import { useLocalSearchParams } from "expo-router";
import { InitiativeEditor } from "@/features/parity/planning/initiative-editor";

export default function EditInitiativeRoute() {
  const { initiativeId } = useLocalSearchParams<{ initiativeId: string }>();
  return <InitiativeEditor key={initiativeId} initiativeId={initiativeId} />;
}
