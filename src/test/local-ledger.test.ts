import { describe, expect, it } from "vitest";
import { emptyLedger, readLocalLedger } from "@/lib/local-ledger";

describe("Existing ledger data safety", () => {
  it("never invents business records for a new browser", () => {
    expect(readLocalLedger(null).data).toEqual({ clients: [], projects: [], payments: [], expenses: [], activity: [] });
  });
  it("preserves existing records and unknown fields for explicit import", () => {
    const original = { ...emptyLedger(), clients: [{ id: "existing-client", name: "Existing client", kind: "business", email: "", phone: "", location: "", createdAt: "2026-10-29", legacyNote: "keep" }], importMetadata: { version: 2 } };
    expect(readLocalLedger(JSON.stringify(original)).data).toEqual(original);
  });
  it("returns no replacement data when a saved copy is unreadable", () => {
    const result = readLocalLedger("{broken");
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });
  it("rejects unsupported records rather than silently dropping them", () => {
    expect(readLocalLedger(JSON.stringify({ ...emptyLedger(), projects: [{ id: "p1" }] })).data).toBeNull();
  });
});