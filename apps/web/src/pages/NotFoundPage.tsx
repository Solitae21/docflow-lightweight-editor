import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div
      className="container"
      style={{ paddingTop: "5rem", textAlign: "center", animation: "rise 0.45s ease both" }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "6rem",
            fontWeight: 700,
            lineHeight: 1,
            color: "var(--accent)",
            marginBottom: "0.5rem",
          }}
        >
          404
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.6rem",
            marginBottom: "0.75rem",
          }}
        >
          Page not found
        </h1>
        <p className="sub" style={{ marginBottom: "2rem" }}>
          This page doesn't exist, or you may not have access to it.
        </p>
        <Link to="/" className="btn btn-primary">
          ← Back to documents
        </Link>
      </div>
    </div>
  );
}
