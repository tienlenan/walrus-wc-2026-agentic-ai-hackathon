import { Component, type ReactNode } from "react";
import { isChunkLoadError, reloadOnceForStaleChunk } from "../lib/chunk-recovery";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Last line of defence: a failed chunk load (or any render throw) must never leave the user on a
// blank background. Chunk errors self-heal via a single reload; everything else shows a reload card.
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    if (isChunkLoadError(error) && reloadOnceForStaleChunk()) return;
    console.error("[app] render error:", error);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.85rem",
          padding: "2rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#141414",
        }}
      >
        <strong style={{ fontSize: "1.1rem" }}>Gil dropped the receipts mid-shuffle.</strong>
        <span style={{ opacity: 0.75, maxWidth: "32rem" }}>
          The page didn&apos;t finish loading from Walrus. Reload to fetch the latest build.
        </span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            border: "2px solid #141414",
            background: "#f8c54f",
            color: "#141414",
            padding: "0.5rem 1.1rem",
            fontWeight: 800,
            cursor: "pointer",
            borderRadius: 6,
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
