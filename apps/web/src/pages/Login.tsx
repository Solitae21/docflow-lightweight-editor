import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@docflow/shared";
import { api } from "../api/client";
import { useUser } from "../auth/UserContext";
import { initials } from "../lib/initials";
import { Spinner } from "../components/Spinner";

export function Login() {
  const { user, login } = useUser();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    api
      .listUsers()
      .then(setUsers)
      .catch((e) => setError(e.message));
  }, []);

  async function handleLogin(email: string) {
    setBusy(true);
    setError(null);
    try {
      await login(email);
      navigate("/", { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-eyebrow">DocFlow</div>
      <h1>
        A calm place
        <br />
        to <em>write</em> &amp; share.
      </h1>
      <p>Pick a seeded account to sign in — no password, this is demo auth.</p>
      {error && <div className="error-msg">{error}</div>}
      <div className="user-list">
        {users.map((u) => (
          <button
            key={u.id}
            className="btn user-pick"
            disabled={busy}
            onClick={() => handleLogin(u.email)}
          >
            <span className="avatar" aria-hidden="true">
              {initials(u.name)}
            </span>
            <span className="pick-text">
              <span className="name">{u.name}</span>
              <span className="email">{u.email}</span>
            </span>
            <span className="pick-arrow" aria-hidden="true">
              {busy ? <Spinner /> : "→"}
            </span>
          </button>
        ))}
        {users.length === 0 && !error && <div className="empty">Loading accounts…</div>}
      </div>
    </div>
  );
}
