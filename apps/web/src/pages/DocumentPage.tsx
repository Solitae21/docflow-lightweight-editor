import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Editor } from "../components/Editor";
import { ShareModal } from "../components/ShareModal";
import { useDocument, type SaveStatus } from "../hooks/useDocument";

export function DocumentPage() {
  const { id = "" } = useParams();
  const [showShare, setShowShare] = useState(false);
  const {
    doc,
    title,
    status,
    error,
    loadError,
    canWrite,
    isOwner,
    setTitle,
    setContent,
  } = useDocument(id);

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
      <Link to="/" className="btn btn-sm btn-ghost editor-back">
        ← All documents
      </Link>

      {error && <div className="error-msg">{error}</div>}

      <div className="editor-topbar">
        <input
          className="title-input"
          value={title}
          disabled={!canWrite}
          placeholder="Untitled document"
          onChange={(e) => setTitle(e.target.value)}
        />
        {canWrite && (
          <span className={`save-status is-${status}`}>
            <span className="dot" />
            {statusLabel[status]}
          </span>
        )}
        {isOwner && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowShare(true)}>
            ⤳ Share
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
        onChange={setContent}
      />

      {showShare && <ShareModal documentId={id} onClose={() => setShowShare(false)} />}
    </div>
  );
}
