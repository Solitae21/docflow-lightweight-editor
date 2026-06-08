import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Supabase client before importing the module under test.
const single = vi.fn();
const maybeSingle = vi.fn();

vi.mock("../supabase.js", () => {
  // Each .from() returns a thin chainable whose terminal calls are the mocks above.
  const builder = {
    select: () => builder,
    eq: () => builder,
    single,
    maybeSingle,
  };
  return { supabase: { from: () => builder } };
});

const { getDocumentAccess, canWrite } = await import("./access.js");

const DOC = {
  id: "doc-1",
  title: "T",
  content: "",
  owner_id: "owner-1",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

beforeEach(() => {
  single.mockReset();
  maybeSingle.mockReset();
});

describe("getDocumentAccess", () => {
  it("returns 'owner' when the user owns the document", async () => {
    single.mockResolvedValueOnce({ data: DOC, error: null });

    const result = await getDocumentAccess("doc-1", "owner-1");

    expect(result).toEqual({ document: DOC, accessLevel: "owner" });
    expect(maybeSingle).not.toHaveBeenCalled(); // no share lookup needed
  });

  it("returns the share permission ('edit') for a non-owner with a share", async () => {
    single.mockResolvedValueOnce({ data: DOC, error: null });
    maybeSingle.mockResolvedValueOnce({ data: { permission: "edit" }, error: null });

    const result = await getDocumentAccess("doc-1", "user-2");

    expect(result).toEqual({ document: DOC, accessLevel: "edit" });
  });

  it("returns 'view' for a view-only sharee", async () => {
    single.mockResolvedValueOnce({ data: DOC, error: null });
    maybeSingle.mockResolvedValueOnce({ data: { permission: "view" }, error: null });

    const result = await getDocumentAccess("doc-1", "user-2");

    expect(result?.accessLevel).toBe("view");
  });

  it("returns null when the document does not exist", async () => {
    single.mockResolvedValueOnce({ data: null, error: { message: "not found" } });

    expect(await getDocumentAccess("missing", "user-2")).toBeNull();
  });

  it("returns null when the user has no ownership and no share", async () => {
    single.mockResolvedValueOnce({ data: DOC, error: null });
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    expect(await getDocumentAccess("doc-1", "stranger")).toBeNull();
  });
});

describe("canWrite", () => {
  it("is true for owner and edit, false for view", () => {
    expect(canWrite("owner")).toBe(true);
    expect(canWrite("edit")).toBe(true);
    expect(canWrite("view")).toBe(false);
  });
});
