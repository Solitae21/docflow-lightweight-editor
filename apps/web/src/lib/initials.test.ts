import { describe, expect, it } from "vitest";
import { initials } from "./initials";

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
  });

  it("uses a single initial for a one-word name", () => {
    expect(initials("Alice")).toBe("A");
  });

  it("ignores extra whitespace and caps at two letters", () => {
    expect(initials("  Grace  Brewster  Murray ")).toBe("GB");
  });

  it("returns an empty string for an empty name", () => {
    expect(initials("")).toBe("");
  });
});
