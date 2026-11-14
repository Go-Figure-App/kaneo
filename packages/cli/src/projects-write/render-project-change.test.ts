import { describe, expect, it } from "vite-plus/test";
import { makeUi } from "../render/ui.js";
import { stringWidth } from "../render/width.js";
import {
  renderProjectChange,
  renderProjectUnchanged,
} from "./render-project-change.js";

const ui = makeUi({
  color: 0,
  unicode: true,
  hyperlinks: false,
  animate: false,
  columns: 80,
});

describe("renderProjectChange", () => {
  it("prints the created project on one line", () => {
    expect(
      renderProjectChange(ui, {
        verb: "Created",
        name: "Tracing Web",
        key: "KAN",
        url: "https://tracing.test/p",
      }),
    ).toEqual(["", "  ✓ Created project Tracing Web · KAN", ""]);
  });

  it("adds the changed fields and the move target", () => {
    expect(
      renderProjectChange(ui, {
        verb: "Updated",
        name: "Tracing Web",
        key: "WEB",
        url: "https://tracing.test/p",
        detail: "name, key",
      })[1],
    ).toBe("  ✓ Updated project Tracing Web · WEB · name, key");
    expect(
      renderProjectChange(ui, {
        verb: "Moved",
        name: "Tracing Web",
        key: "KAN",
        url: "https://tracing.test/p",
        target: "Side Project",
      })[1],
    ).toBe("  ✓ Moved project Tracing Web · KAN → Side Project");
  });

  it("shortens a long name to fit 80 columns", () => {
    const [, line] = renderProjectChange(ui, {
      verb: "Archived",
      name: "A very long project name ".repeat(5).trim(),
      key: "LONG",
      url: "https://tracing.test/p",
    });
    expect(stringWidth(line ?? "")).toBeLessThanOrEqual(80);
    expect(line).toContain("… · LONG");
  });

  it("uses ASCII glyphs when the terminal needs them", () => {
    const ascii = makeUi({
      color: 0,
      unicode: false,
      hyperlinks: false,
      animate: false,
      columns: 80,
    });
    expect(
      renderProjectChange(ascii, {
        verb: "Deleted",
        name: "Tracing Web",
        key: "KAN",
        url: "",
        detail: "12 tasks",
      })[1],
    ).toBe("  + Deleted project Tracing Web - KAN - 12 tasks");
  });
});

describe("renderProjectUnchanged", () => {
  it("says the project was already in that state", () => {
    expect(
      renderProjectUnchanged(ui, {
        name: "Tracing Web",
        key: "KAN",
        url: "https://tracing.test/p",
        state: "archived",
      }),
    ).toEqual(["", "  ✓ Tracing Web · KAN is already archived", ""]);
  });
});
