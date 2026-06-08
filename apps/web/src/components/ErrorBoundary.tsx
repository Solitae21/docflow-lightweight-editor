import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="container" style={{ paddingTop: "4rem", textAlign: "center" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <hr style={{ border: "none", borderTop: "3px solid var(--accent)", marginBottom: "2rem", width: 48 }} />
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p
            className="sub"
            style={{ fontFamily: "var(--font-read)", fontStyle: "italic", marginBottom: "2rem" }}
          >
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={this.handleReset}>
              Try again
            </button>
            <Link to="/" className="btn btn-ghost">
              Go home
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
