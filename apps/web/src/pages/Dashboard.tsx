import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { DocumentListItem } from "@docflow/shared";
import { formatDate } from "../lib/formatDate";
import { useDocuments } from "../hooks/useDocuments";
import { useToast } from "../toast/ToastContext";
import { Spinner } from "../components/Spinner";

export function Dashboard() {
  const navigate = useNavigate();
  const { docs, loading, busy, deletingId, error, create, upload, remove } = useDocuments();
  const fileInput = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const lastToastedError = useRef<string | null>(null);

  useEffect(() => {
    if (error && error !== lastToastedError.current) {
      lastToastedError.current = error;
      toast.error(error);
    }
  }, [error, toast]);

  async function handleNew() {
    const id = await create();
    if (id) navigate(`/documents/${id}`);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const id = await upload(file);
    if (fileInput.current) fileInput.current.value = "";
    if (id) navigate(`/documents/${id}`);
  }

  function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    void remove(id);
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
              disabled={!!deletingId}
            >
              {deletingId === doc.id ? <Spinner /> : null} Delete
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
            {busy ? <Spinner /> : "✎"} New document
          </button>
          <button
            className="btn"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
          >
            {busy ? <Spinner /> : "↑"} Upload
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
