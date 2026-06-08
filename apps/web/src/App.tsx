import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useUser } from "./auth/UserContext";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { DocumentPage } from "./pages/DocumentPage";
import type { ReactNode } from "react";

function Header() {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <header className="app-header">
      <div className="brand" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
        📄 DocFlow
      </div>
      <div className="user-box">
        <span>
          Signed in as <strong>{user.name}</strong>
        </span>
        <button
          className="btn btn-sm"
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
