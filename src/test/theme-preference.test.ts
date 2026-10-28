import { describe, expect, it } from "vitest";
import { parseTheme } from "@/lib/theme-preference";

describe("Ledger theme preference", () => {
  it("defaults to the existing dark theme", () => {
    expect(parseTheme(null)).toBe("dark");
    expect(parseTheme("invalid")).toBe("dark");
  });
  it("restores an explicitly selected light preference", () => {
    expect(parseTheme("light")).toBe("light");
  });
});