import { useLocalSearchParams } from "expo-router";
import { InitiativeEditor } from "@/features/parity/planning/initiative-editor";

export default function NewInitiativeRoute() {
  const { workspaceId } = useLocalSearchParams<{ workspaceId: string }>();
  return <InitiativeEditor key={workspaceId} workspaceId={workspaceId} />;
}
