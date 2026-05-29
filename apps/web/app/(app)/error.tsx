"use client";

import { useEffect } from "react";
import { RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

/**
 * Error boundary for all (app) routes. Catches any server-component or client
 * error and shows it inline so the user (and dev) can see what actually went wrong.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Pulse error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-danger/15">
        <div className="size-4 rounded-full bg-danger" />
      </div>
      <h1 className="mb-1 text-xl font-semibold">Something broke</h1>
      <p className="mb-4 text-sm text-text-secondary">
        Try again. If it keeps happening, share this error and I&apos;ll fix it.
      </p>

      <div className="mb-5 w-full rounded-[var(--radius-card)] border border-hairline bg-surface p-3 text-left">
        <p className="mb-1 text-[10px] uppercase tracking-wider text-text-tertiary">Error message</p>
        <code className="block whitespace-pre-wrap break-words font-mono text-xs text-text-primary">
          {error.message || "Unknown error"}
        </code>
        {error.digest && (
          <>
            <p className="mt-3 mb-1 text-[10px] uppercase tracking-wider text-text-tertiary">Digest</p>
            <code className="block font-mono text-[11px] text-text-secondary">{error.digest}</code>
          </>
        )}
      </div>

      <div className="flex w-full gap-2">
        <PrimaryButton accent="workout" onClick={reset} className="flex-1">
          <RefreshCw className="size-4" /> Try again
        </PrimaryButton>
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 rounded-[var(--radius-card)] border border-hairline bg-surface px-4 py-3 text-sm text-text-secondary"
        >
          <Home className="size-4" /> Dashboard
        </Link>
      </div>
    </div>
  );
}
