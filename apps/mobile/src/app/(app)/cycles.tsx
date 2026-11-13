import { useLocalSearchParams } from "expo-router";
import { CycleList } from "@/features/parity/cycles/cycle-list";
export default function CyclesRoute() {
  const { workspaceId } = useLocalSearchParams<{ workspaceId: string }>();
  return <CycleList key={workspaceId} workspaceId={workspaceId} />;
}
