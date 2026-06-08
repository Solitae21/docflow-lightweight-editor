import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DocumentListItem, DocumentsResponse } from "@docflow/shared";
import { api } from "../api/client";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function Dashboard() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DocumentsResponse>({ owned: [], shared: [] });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      setDocs(await api.listDocuments());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleNew() {
    setBusy(true);
    setError(null);
    try {
      const doc = await api.createDocument();
      navigate(`/documents/${doc.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const doc = await api.uploadDocument(file);
      navigate(`/documents/${doc.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.deleteDocument(id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function renderRow(doc: DocumentListItem, owned: boolean) {
    return (
      <div className="doc-row" key={doc.id}>
        <div>
          <div className="doc-title">
            {doc.title}
            {!owned && (
              <span className={`badge ${doc.accessLevel === "view" ? "badge-view" : ""}`}>
                {doc.accessLevel}
              </span>
            )}
          </div>
          <div className="doc-meta">Updated {formatDate(doc.updated_at)}</div>
        </div>
        <div className="row-actions">
          <button className="btn btn-sm" onClick={() => navigate(`/documents/${doc.id}`)}>
            Open
          </button>
          {owned && (
            <button
              className="btn btn-sm btn-danger"
              onClick={() => handleDelete(doc.id, doc.title)}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="dashboard-actions">
        <button className="btn btn-primary" onClick={handleNew} disabled={busy}>
          + New Document
        </button>
        <button
          className="btn"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
        >
          ⬆ Upload File
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".txt,.md,.markdown,.docx"
          style={{ display: "none" }}
          onChange={handleUpload}
        />
      </div>
      <p className="doc-meta" style={{ marginTop: "-12px", marginBottom: 24 }}>
        Supported uploads: <strong>.txt</strong>, <strong>.md</strong>, <strong>.docx</strong> —
        converted into a new editable document.
      </p>

      {error && <div className="error-msg">{error}</div>}
      {loading ? (
        <div className="loading">Loading documents…</div>
      ) : (
        <>
          <section className="doc-section">
            <h2>My Documents</h2>
            <div className="doc-list">
              {docs.owned.length === 0 ? (
                <div className="empty">No documents yet. Create or upload one above.</div>
              ) : (
                docs.owned.map((d) => renderRow(d, true))
              )}
            </div>
          </section>

          <section className="doc-section">
            <h2>Shared with me</h2>
            <div className="doc-list">
              {docs.shared.length === 0 ? (
                <div className="empty">Nothing shared with you yet.</div>
              ) : (
                docs.shared.map((d) => renderRow(d, false))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
