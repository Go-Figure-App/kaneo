import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { parseISO } from "date-fns";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { MilestoneMarker } from "./milestone-marker";
import { roadmapProject } from "./test-fixtures";
import { timelineWindow } from "./timeline";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
beforeEach(() => {
  vi.stubGlobal("PointerEvent", MouseEvent);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const window = timelineWindow(parseISO("2026-11-13"), "month");
const milestone = {
  id: "milestone",
  projectId: "project",
  name: "Beta",
  targetDate: "2026-11-15",
  position: 0,
  progress: roadmapProject().progress,
};
it("keeps an off-window marker mounted until save or cancellation", () => {
  const onChange = vi.fn();
  render(
    <MilestoneMarker
      milestone={milestone}
      window={window}
      disabled={false}
      onChange={onChange}
    />,
  );
  const button = screen.getByRole("button", {
    name: "parity:roadmap.moveMilestone",
  });
  const clientX = 100 + 20 * window.dayWidth;
  fireEvent.pointerDown(button, { button: 0, clientX: 100 });
  fireEvent.pointerMove(button, { clientX });
  expect(button).toBeInTheDocument();
  expect(button).toHaveStyle({ opacity: "0" });
  fireEvent.keyDown(button, { key: "Escape" });
  fireEvent.pointerUp(button, { clientX });
  expect(onChange).not.toHaveBeenCalled();
  expect(button).toHaveAttribute(
    "title",
    expect.stringContaining("2026-11-15"),
  );
  fireEvent.pointerDown(button, { button: 0, clientX: 100 });
  fireEvent.pointerMove(button, { clientX });
  fireEvent.pointerUp(button, { clientX });
  expect(onChange).toHaveBeenCalledExactlyOnceWith("2026-12-05");
});
it("commits the preview after a milestone date refresh during dragging", () => {
  const onChange = vi.fn();
  const props = { window, disabled: false, onChange };
  const { rerender } = render(
    <MilestoneMarker {...props} milestone={milestone} />,
  );
  const button = screen.getByRole("button", {
    name: "parity:roadmap.moveMilestone",
  });
  fireEvent.pointerDown(button, { button: 0, clientX: 100 });
  fireEvent.pointerMove(button, { clientX: 136 });
  rerender(
    <MilestoneMarker
      {...props}
      milestone={{ ...milestone, targetDate: "2026-11-20" }}
    />,
  );
  expect(button).toHaveAttribute(
    "title",
    expect.stringContaining("2026-11-21"),
  );
  fireEvent.pointerUp(button, { clientX: 136 });
  expect(onChange).toHaveBeenCalledExactlyOnceWith("2026-11-21");
});
