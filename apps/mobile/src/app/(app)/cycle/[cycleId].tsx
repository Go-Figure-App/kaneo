import { useLocalSearchParams } from "expo-router";
import { CycleDetailScreen } from "@/features/parity/cycles/cycle-detail";
export default function CycleRoute() {
  const { cycleId } = useLocalSearchParams<{ cycleId: string }>();
  return <CycleDetailScreen key={cycleId} cycleId={cycleId} />;
}
