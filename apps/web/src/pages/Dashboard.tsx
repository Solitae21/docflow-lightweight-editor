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
        <div className="doc-head">
          <span className="doc-icon" aria-hidden="true" />
          <div>
            <div className="doc-title">{doc.title}</div>
            <div className="doc-meta">Updated {formatDate(doc.updated_at)}</div>
          </div>
          {!owned && (
            <span
              className={`badge ${doc.accessLevel === "view" ? "badge-view" : ""}`}
              style={{ marginLeft: "auto" }}
            >
              {doc.accessLevel}
            </span>
          )}
        </div>
        <div className="row-actions">
          <button
            className="btn btn-sm btn-primary"
            onClick={() => navigate(`/documents/${doc.id}`)}
          >
            Open
          </button>
          {owned && (
            <button
              className="btn btn-sm btn-danger"
              title="Delete document"
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
      <div className="dashboard-head">
        <div>
          <h1>Your documents</h1>
          <p className="sub">
            Create, upload, and share. Uploads support{" "}
            <strong>.txt</strong>, <strong>.md</strong>, and <strong>.docx</strong>.
          </p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-primary" onClick={handleNew} disabled={busy}>
            ✎ New document
          </button>
          <button
            className="btn"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
          >
            ↑ Upload
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".txt,.md,.markdown,.docx"
            style={{ display: "none" }}
            onChange={handleUpload}
          />
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {loading ? (
        <div className="loading">Loading documents…</div>
      ) : (
        <>
          <section className="doc-section">
            <h2>
              My documents <span className="count">{docs.owned.length}</span>
            </h2>
            <div className="doc-list">
              {docs.owned.length === 0 ? (
                <div className="empty">No documents yet. Create or upload one above.</div>
              ) : (
                docs.owned.map((d) => renderRow(d, true))
              )}
            </div>
          </section>

          <section className="doc-section">
            <h2>
              Shared with me <span className="count">{docs.shared.length}</span>
            </h2>
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
