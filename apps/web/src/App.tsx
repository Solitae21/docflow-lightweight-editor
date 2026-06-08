import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useUser } from "./auth/UserContext";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { DocumentPage } from "./pages/DocumentPage";
import { initials } from "./lib/initials";
import type { ReactNode } from "react";

function Header() {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <header className="app-header">
      <div className="brand" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
        Doc<span className="brand-mark">Flow</span>
        <span className="brand-dot">.</span>
      </div>
      <div className="user-box">
        <span className="who">
          Signed in as <strong>{user.name}</strong>
        </span>
        <span className="avatar" title={user.name}>
          {initials(user.name)}
        </span>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          Log out
        </button>
      </div>
    </header>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useUser();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/documents/:id"
          element={
            <RequireAuth>
              <DocumentPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
