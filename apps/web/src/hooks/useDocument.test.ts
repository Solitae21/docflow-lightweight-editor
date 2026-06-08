import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentDetail } from "@docflow/shared";

vi.mock("../api/client", () => ({
  api: { getDocument: vi.fn(), updateDocument: vi.fn() },
}));

import { api } from "../api/client";
import { useDocument } from "./useDocument";

const makeDoc = (accessLevel: DocumentDetail["accessLevel"]): DocumentDetail => ({
  id: "d1",
  title: "Doc",
  content: "<p>orig</p>",
  owner_id: "u1",
  created_at: "",
  updated_at: "",
  accessLevel,
  ownerName: "Owner",
});

// Render the hook and let the initial getDocument() resolve.
async function mount(accessLevel: DocumentDetail["accessLevel"]) {
  vi.mocked(api.getDocument).mockResolvedValue(makeDoc(accessLevel));
  vi.mocked(api.updateDocument).mockResolvedValue(makeDoc(accessLevel));
  const view = renderHook(() => useDocument("d1"));
  await act(async () => {}); // flush the load promise
  return view;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});
afterEach(() => vi.useRealTimers());

describe("useDocument autosave", () => {
  it("debounces rapid edits into a single save and ends in 'saved'", async () => {
    const { result } = await mount("owner");

    act(() => {
      result.current.setContent("<p>a</p>");
      result.current.setContent("<p>ab</p>");
      result.current.setContent("<p>abc</p>");
    });
    expect(result.current.status).toBe("unsaved");
    expect(api.updateDocument).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(api.updateDocument).toHaveBeenCalledTimes(1);
    expect(api.updateDocument).toHaveBeenCalledWith("d1", {
      title: "Doc",
      content: "<p>abc</p>",
    });
    expect(result.current.status).toBe("saved");
  });

  it("sets status 'error' when the save fails", async () => {
    const { result } = await mount("owner");
    vi.mocked(api.updateDocument).mockRejectedValueOnce(new Error("boom"));

    act(() => result.current.setContent("<p>x</p>"));
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("boom");
  });

  it("does not save for a view-only document", async () => {
    const { result } = await mount("view");

    act(() => result.current.setContent("<p>nope</p>"));
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(api.updateDocument).not.toHaveBeenCalled();
    expect(result.current.canWrite).toBe(false);
  });
});
