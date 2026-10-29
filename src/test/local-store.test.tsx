import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StoreProvider, useStore } from "@/lib/store";
import { emptyLedger, LEDGER_KEY } from "@/lib/local-ledger";

function Probe() {
  const { data, set, storageError, loaded } = useStore();
  return <div><span data-testid="count">{data.clients.length}</span><span data-testid="loaded">{String(loaded)}</span><span role="alert">{storageError}</span><button onClick={() => set((d) => ({ ...d, clients: [...d.clients, { id: "new", name: "New client", kind: "business", email: "", phone: "", location: "", createdAt: "2026-10-29" }] }))}>Add</button></div>;
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Browser-copy preservation", () => {
  it("does not seed or write business records on initial load", async () => {
    render(<StoreProvider><Probe /></StoreProvider>);
    await waitFor(() => expect(screen.getByTestId("loaded")).toHaveTextContent("true"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(localStorage.getItem(LEDGER_KEY)).toBeNull();
  });
  it("blocks edits without overwriting a malformed original", async () => {
    localStorage.setItem(LEDGER_KEY, "{broken");
    render(<StoreProvider><Probe /></StoreProvider>);
    await waitFor(() => expect(screen.getByRole("alert")).not.toBeEmptyDOMElement());
    act(() => screen.getByRole("button", { name: "Add" }).click());
    expect(localStorage.getItem(LEDGER_KEY)).toBe("{broken");
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });
  it("retains old records when adding to a valid browser copy", async () => {
    const original = { ...emptyLedger(), clients: [{ id: "old", name: "Existing client", kind: "business", email: "", phone: "", location: "", createdAt: "2026-10-28", legacy: "retained" }] };
    localStorage.setItem(LEDGER_KEY, JSON.stringify(original));
    render(<StoreProvider><Probe /></StoreProvider>);
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));
    act(() => screen.getByRole("button", { name: "Add" }).click());
    await waitFor(() => expect(JSON.parse(localStorage.getItem(LEDGER_KEY) ?? "{}").clients).toHaveLength(2));
    expect(JSON.parse(localStorage.getItem(LEDGER_KEY) ?? "{}").clients[0]).toEqual(original.clients[0]);
  });
  it("shows a save failure instead of pretending storage succeeded", async () => {
    render(<StoreProvider><Probe /></StoreProvider>);
    await waitFor(() => expect(screen.getByTestId("loaded")).toHaveTextContent("true"));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage full"); });
    act(() => screen.getByRole("button", { name: "Add" }).click());
    await waitFor(() => expect(screen.getByRole("alert")).not.toBeEmptyDOMElement());
    expect(localStorage.getItem(LEDGER_KEY)).toBeNull();
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });
});