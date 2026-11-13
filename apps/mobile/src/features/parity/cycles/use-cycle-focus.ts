import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

export function useCycleFocus(refetch: () => Promise<unknown>, enabled = true) {
  // Native stacks retain screens while task editors cover them. Refresh on
  // return even when the hidden screen's query observer missed invalidation.
  useFocusEffect(
    useCallback(() => {
      if (enabled) void refetch();
    }, [enabled, refetch]),
  );
}
