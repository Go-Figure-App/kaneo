import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export function useDragDays(
  dayWidth: number,
  disabled: boolean,
  onCommit: (days: number) => void,
) {
  const [delta, setDelta] = useState(0);
  const drag = useRef<{
    x: number;
    pointer: number;
    width: number;
    commit: typeof onCommit;
  } | null>(null);
  const cancel = () => {
    drag.current = null;
    setDelta(0);
  };
  return {
    delta,
    handlers: {
      onPointerDown(event: PointerEvent<HTMLButtonElement>) {
        if (disabled || event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
          x: event.clientX,
          pointer: event.pointerId,
          width: dayWidth,
          commit: onCommit,
        };
      },
      onPointerMove(event: PointerEvent<HTMLButtonElement>) {
        const active = drag.current;
        if (active?.pointer === event.pointerId)
          setDelta(Math.round((event.clientX - active.x) / active.width));
      },
      onPointerUp(event: PointerEvent<HTMLButtonElement>) {
        const active = drag.current;
        if (!active || active.pointer !== event.pointerId) return;
        const days = Math.round((event.clientX - active.x) / active.width);
        cancel();
        event.currentTarget.releasePointerCapture(event.pointerId);
        if (days && !disabled) active.commit(days);
      },
      onPointerCancel: cancel,
      onLostPointerCapture: cancel,
      onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        if (event.key === "Escape") {
          cancel();
          return;
        }
        if (disabled || !["ArrowLeft", "ArrowRight"].includes(event.key))
          return;
        event.preventDefault();
        onCommit(
          (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 7 : 1),
        );
      },
    },
  };
}
