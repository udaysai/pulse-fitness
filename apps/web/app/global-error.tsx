"use client";

import { useEffect } from "react";
import { recoverFromChunkError } from "@/lib/chunk-recovery";

/**
 * Last-resort error boundary — catches errors in the root layout itself.
 * Must include its own <html> and <body> tags.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    recoverFromChunkError(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#0b0b0e",
          color: "#f5f5f4",
          padding: 24,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Something broke at the root</h1>
        <p style={{ fontSize: 14, color: "#a1a1a8", marginBottom: 16, maxWidth: 360 }}>
          {error.message || "Unknown error"}
        </p>
        {error.digest && (
          <code style={{ fontSize: 11, color: "#6b6b70", marginBottom: 16 }}>
            digest: {error.digest}
          </code>
        )}
        <button
          onClick={reset}
          style={{
            background: "#e85d4a",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: 16,
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
