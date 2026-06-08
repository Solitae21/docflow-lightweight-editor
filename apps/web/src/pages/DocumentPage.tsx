import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { DocumentDetail } from "@docflow/shared";
import { api } from "../api/client";
import { Editor } from "../components/Editor";
import { ShareModal } from "../components/ShareModal";

type SaveStatus = "saved" | "unsaved" | "saving" | "error";

const SAVE_DEBOUNCE_MS = 800;

export function DocumentPage() {
  const { id = "" } = useParams();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);

  // Latest values to persist (refs avoid stale closures in the debounce timer).
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
        setTitle(d.title);
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

  function handleTitleChange(value: string) {
    setTitle(value);
    titleRef.current = value;
    scheduleSave();
  }

  function handleContentChange(html: string) {
    contentRef.current = html;
    scheduleSave();
  }

  if (loadError) {
    return (
      <div className="container">
        <div className="error-msg">{loadError}</div>
        <Link to="/" className="btn">
          ← Back to documents
        </Link>
      </div>
    );
  }

  if (!doc) return <div className="loading">Loading document…</div>;

  const statusLabel: Record<SaveStatus, string> = {
    saved: "Saved",
    unsaved: "Unsaved…",
    saving: "Saving…",
    error: "Save failed",
  };

  return (
    <div className="container">
      <Link to="/" className="btn btn-sm" style={{ marginBottom: 16, display: "inline-block" }}>
        ← Back
      </Link>

      {error && <div className="error-msg">{error}</div>}

      <div className="editor-topbar">
        <input
          className="title-input"
          value={title}
          disabled={!canWrite}
          placeholder="Untitled document"
          onChange={(e) => handleTitleChange(e.target.value)}
        />
        <span className="save-status">{canWrite ? statusLabel[status] : ""}</span>
        {isOwner && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowShare(true)}>
            Share
          </button>
        )}
      </div>

      {!canWrite && (
        <div className="readonly-banner">
          👁 View-only — shared by {doc.ownerName}. You can read but not edit this document.
        </div>
      )}

      <Editor
        initialContent={doc.content}
        editable={canWrite}
        onChange={handleContentChange}
      />

      {showShare && <ShareModal documentId={id} onClose={() => setShowShare(false)} />}
    </div>
  );
}
