import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { parseISO } from "date-fns";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { ProjectBar } from "./project-bar";
import { timelineWindow } from "./timeline";
import { roadmapProject } from "./test-fixtures";

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
it("supports moving and resizing dates from the keyboard", () => {
  const onChange = vi.fn();
  render(
    <ProjectBar
      project={roadmapProject()}
      window={window}
      disabled={false}
      onChange={onChange}
    />,
  );
  fireEvent.keyDown(
    screen.getByRole("button", { name: "parity:roadmap.moveProject" }),
    { key: "ArrowRight", shiftKey: true },
  );
  expect(onChange).toHaveBeenLastCalledWith({
    startDate: "2026-11-17",
    targetDate: "2026-11-27",
  });
  fireEvent.keyDown(
    screen.getByRole("button", { name: "parity:roadmap.resizeStart" }),
    { key: "ArrowLeft" },
  );
  expect(onChange).toHaveBeenLastCalledWith({
    startDate: "2026-11-09",
    targetDate: "2026-11-20",
  });
});
it("commits a drag once and cancels without writes on Escape or pointer cancellation", () => {
  const onChange = vi.fn();
  render(
    <ProjectBar
      project={roadmapProject()}
      window={window}
      disabled={false}
      onChange={onChange}
    />,
  );
  const bar = screen.getByRole("button", {
    name: "parity:roadmap.moveProject",
  });
  fireEvent.pointerDown(bar, { button: 0, clientX: 100 });
  fireEvent.pointerMove(bar, { clientX: 172 });
  fireEvent.keyDown(bar, { key: "Escape" });
  fireEvent.pointerUp(bar, { clientX: 172 });
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.pointerDown(bar, { button: 0, clientX: 100 });
  fireEvent.pointerCancel(bar);
  fireEvent.pointerUp(bar, { clientX: 172 });
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.pointerDown(bar, { button: 0, clientX: 100 });
  fireEvent.pointerUp(bar, { clientX: 172 });
  expect(onChange).toHaveBeenCalledExactlyOnceWith({
    startDate: "2026-11-12",
    targetDate: "2026-11-22",
  });
});
it("exposes no editable handles or keyboard writes for a viewer", () => {
  const onChange = vi.fn();
  render(
    <ProjectBar
      project={roadmapProject()}
      window={window}
      disabled
      onChange={onChange}
    />,
  );
  expect(
    screen.queryByRole("button", { name: "parity:roadmap.resizeStart" }),
  ).toBeNull();
  const bar = screen.getByRole("button", {
    name: "parity:roadmap.moveProject",
  });
  expect(bar).toBeDisabled();
  fireEvent.keyDown(bar, { key: "ArrowLeft" });
  expect(onChange).not.toHaveBeenCalled();
});
