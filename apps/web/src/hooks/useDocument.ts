import { useCallback, useEffect, useRef, useState } from "react";
import type { DocumentDetail } from "@docflow/shared";
import { api } from "../api/client";

export type SaveStatus = "saved" | "unsaved" | "saving" | "error";

const SAVE_DEBOUNCE_MS = 800;

interface UseDocument {
  doc: DocumentDetail | null;
  title: string;
  status: SaveStatus;
  error: string | null; // a failed save
  loadError: string | null; // the document failed to load
  canWrite: boolean;
  isOwner: boolean;
  setTitle: (value: string) => void;
  setContent: (html: string) => void;
}

// Owns a single document's data and its debounced autosave. Refs hold the latest
// title/content so the debounce timer never persists stale values, and any pending
// save is flushed on unmount. The page is left as pure presentation.
export function useDocument(id: string): UseDocument {
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [title, setTitleState] = useState("");
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const contentRef = useRef("");
  const titleRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  const canWrite = doc ? doc.accessLevel !== "view" : false;
  const isOwner = doc?.accessLevel === "owner";

  useEffect(() => {
    let cancelled = false;
    api
      .getDocument(id)
      .then((d) => {
        if (cancelled) return;
        setDoc(d);
        setTitleState(d.title);
        titleRef.current = d.title;
        contentRef.current = d.content;
      })
      .catch((e) => !cancelled && setLoadError((e as Error).message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const save = useCallback(async () => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    setStatus("saving");
    try {
      await api.updateDocument(id, {
        title: titleRef.current,
        content: contentRef.current,
      });
      setStatus("saved");
    } catch (e) {
      setStatus("error");
      setError((e as Error).message);
      dirtyRef.current = true; // allow a retry on the next change
    }
  }, [id]);

  const scheduleSave = useCallback(() => {
    if (!canWrite) return;
    dirtyRef.current = true;
    setStatus("unsaved");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(save, SAVE_DEBOUNCE_MS);
  }, [canWrite, save]);

  // Flush any pending save when leaving the page.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (dirtyRef.current) void save();
    };
  }, [save]);

  const setTitle = useCallback(
    (value: string) => {
      setTitleState(value);
      titleRef.current = value;
      scheduleSave();
    },
    [scheduleSave]
  );

  const setContent = useCallback(
    (html: string) => {
      contentRef.current = html;
      scheduleSave();
    },
    [scheduleSave]
  );

  return {
    doc,
    title,
    status,
    error,
    loadError,
    canWrite,
    isOwner,
    setTitle,
    setContent,
  };
}
