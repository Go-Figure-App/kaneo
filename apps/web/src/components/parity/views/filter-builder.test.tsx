import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vite-plus/test";
import type { ViewFilters } from "@/fetchers/parity/views";
import { FilterBuilder } from "./filter-builder";
vi.mock("react-i18next", async (original) => ({
  ...(await original<object>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
afterEach(cleanup);
function Form() {
  const [filters, setFilters] = useState<ViewFilters>([
    { field: "due", operator: "after", value: "2026-11-01" },
    { field: "due", operator: "before", value: "2026-12-01" },
  ]);
  return (
    <>
      <FilterBuilder filters={filters} onChange={setFilters} />
      <output>{JSON.stringify(filters)}</output>
    </>
  );
}
it("retains input identity while editing and when a preceding filter is removed", () => {
  render(<Form />);
  const inputs = screen.getAllByLabelText("parity:views.filterValue");
  inputs[1]!.focus();
  fireEvent.change(inputs[1]!, { target: { value: "2026-12-02" } });
  expect(document.activeElement).toBe(inputs[1]);
  fireEvent.click(
    screen.getAllByRole("button", { name: "parity:views.removeFilter" })[0]!,
  );
  expect(screen.getByLabelText("parity:views.filterValue")).toBe(inputs[1]);
  expect(screen.getByRole("status").textContent).toContain(
    '"value":"2026-12-02"',
  );
});

it("retains imported workflow names and offers the dynamic current-cycle filter", () => {
  function Imported() {
    const [filters, setFilters] = useState<ViewFilters>([
      { field: "state", operator: "is", values: ["Needs design"] },
    ]);
    return (
      <>
        <FilterBuilder filters={filters} onChange={setFilters} />
        <output>{JSON.stringify(filters)}</output>
      </>
    );
  }
  render(<Imported />);
  expect(
    screen.getByRole("button", { name: "parity:views.filterValue" })
      .textContent,
  ).toBe("Needs design");
  fireEvent.change(screen.getByLabelText("parity:views.field"), {
    target: { value: "cycle-period" },
  });
  expect(screen.getByRole("status").textContent).toContain(
    '"values":["current"]',
  );
  expect(
    screen.getByRole("button", { name: "parity:views.filterValue" })
      .textContent,
  ).toBe("parity:cycles.currentCycle");
  expect(
    screen.getAllByRole("option").map((option) => option.getAttribute("value")),
  ).not.toContain("before");
});
