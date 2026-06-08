import { useEffect, useState } from "react";
import type { Permission, ShareWithUser, User } from "@docflow/shared";
import { api } from "../api/client";
import { useUser } from "../auth/UserContext";
import { initials } from "../lib/initials";

interface ShareModalProps {
  documentId: string;
  onClose: () => void;
}

export function ShareModal({ documentId, onClose }: ShareModalProps) {
  const { user } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [shares, setShares] = useState<ShareWithUser[]>([]);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<Permission>("edit");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadShares() {
    setShares(await api.listShares(documentId));
  }

  useEffect(() => {
    Promise.all([api.listUsers(), api.listShares(documentId)])
      .then(([allUsers, currentShares]) => {
        setUsers(allUsers);
        setShares(currentShares);
        // Default the picker to the first user that isn't the owner.
        const firstOther = allUsers.find((u) => u.id !== user?.id);
        if (firstOther) setEmail(firstOther.email);
      })
      .catch((e) => setError(e.message));
  }, [documentId, user?.id]);

  const sharedUserIds = new Set(shares.map((s) => s.user_id));
  const candidates = users.filter((u) => u.id !== user?.id && !sharedUserIds.has(u.id));

  async function handleAdd() {
    if (!email) return;
    setBusy(true);
    setError(null);
    try {
      await api.createShare(documentId, { email, permission });
      await loadShares();
      const nextCandidate = candidates.find((u) => u.email !== email);
      setEmail(nextCandidate?.email ?? "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(userId: string) {
    setError(null);
    try {
      await api.revokeShare(documentId, userId);
      await loadShares();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Share document</h3>
        <p className="modal-sub">Give a teammate view or edit access.</p>
        {error && <div className="error-msg">{error}</div>}

        <label>Person</label>
        <select value={email} onChange={(e) => setEmail(e.target.value)}>
          {candidates.length === 0 && <option value="">No more users to add</option>}
          {candidates.map((u) => (
            <option key={u.id} value={u.email}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>

        <label>Permission</label>
        <select
          value={permission}
          onChange={(e) => setPermission(e.target.value as Permission)}
        >
          <option value="edit">Can edit</option>
          <option value="view">Can view</option>
        </select>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Close
          </button>
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={busy || !email || candidates.length === 0}
          >
            Share
          </button>
        </div>

        {shares.length > 0 && (
          <ul className="share-list">
            <li className="share-head">People with access</li>
            {shares.map((s) => (
              <li key={s.id}>
                <span className="share-who">
                  <span className="avatar avatar-ochre" aria-hidden="true">
                    {initials(s.user.name)}
                  </span>
                  <span className="share-name">{s.user.name}</span>
                  <span className={`badge ${s.permission === "view" ? "badge-view" : ""}`}>
                    {s.permission}
                  </span>
                </span>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleRevoke(s.user_id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
