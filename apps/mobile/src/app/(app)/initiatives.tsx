import { useLocalSearchParams } from "expo-router";
import { InitiativeList } from "@/features/parity/planning/initiative-list";

export default function InitiativesRoute() {
  const { workspaceId } = useLocalSearchParams<{ workspaceId: string }>();
  return <InitiativeList key={workspaceId} workspaceId={workspaceId} />;
}
