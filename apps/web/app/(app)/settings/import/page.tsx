"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, ArrowLeft, FileArchive, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ACCENT_HEX } from "@/lib/design/accents";
import { cn } from "@/lib/utils";

type Stage = "idle" | "parsing" | "uploading" | "done" | "error";

export default function ImportPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [records, setRecords] = useState(0);
  const [aggregateCount, setAggregateCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setProgress(0);
    setStage("parsing");

    try {
      // Dynamic import to keep the bundle slim for users who never import
      const { parseAppleHealthExport } = await import("@/lib/health/parser");

      const result = await parseAppleHealthExport(file, (p) => {
        const pct = p.totalBytes ? p.bytesProcessed / p.totalBytes : 0;
        setProgress(pct);
        setRecords(p.recordsParsed);
      });
      setAggregateCount(result.aggregates.length);

      // Upload aggregates in one POST (already small JSON)
      setStage("uploading");
      const res = await fetch("/api/health-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_hash: result.fileHash,
          records_imported: result.recordsParsed,
          date_range_start: result.dateRange.start,
          date_range_end: result.dateRange.end,
          metrics: result.aggregates,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Upload failed (${res.status})`);
      }

      setStage("done");
      // Give the user a moment to see success then return to dashboard
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
      setStage("error");
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Import Apple Health" subtitle="One-time and weekly refresh." accentHex={ACCENT_HEX.workout} />

      <div className="space-y-5 px-5 pt-4">
        <Link href="/settings" className="inline-flex items-center gap-1 text-xs text-text-secondary">
          <ArrowLeft className="size-3" /> Settings
        </Link>

        {/* How-to */}
        <ol className="space-y-2 rounded-[var(--radius-card)] border border-hairline bg-surface p-4 text-sm">
          <Step n={1}>Open the <strong>Health</strong> app on your iPhone.</Step>
          <Step n={2}>Tap your profile photo (top-right) → <strong>Export All Health Data</strong>.</Step>
          <Step n={3}>Wait ~30 seconds. Share to yourself (AirDrop or email) as <code>export.zip</code>.</Step>
          <Step n={4}>Tap below or drag the zip here. Parsing happens entirely in your browser — your raw samples never leave the device.</Step>
        </ol>

        {/* Dropzone */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed bg-surface p-8 text-center transition-colors",
            dragOver ? "border-workout bg-surface-raised" : "border-hairline",
            stage !== "idle" && stage !== "error" && "pointer-events-none opacity-70",
          )}
        >
          {stage === "done" ? (
            <CheckCircle2 className="size-10 text-nutrition" />
          ) : (
            <FileArchive className="size-10 text-text-secondary" />
          )}

          {stage === "idle" && (
            <>
              <p className="text-sm font-semibold">Drop export.zip here</p>
              <p className="text-xs text-text-secondary">or click to pick a file</p>
            </>
          )}

          {stage === "parsing" && (
            <>
              <p className="text-sm font-semibold">Parsing…</p>
              <p className="text-xs text-text-secondary">{records.toLocaleString()} records · {(progress * 100).toFixed(0)}%</p>
              <Progress value={progress} />
            </>
          )}

          {stage === "uploading" && (
            <>
              <p className="text-sm font-semibold">Uploading {aggregateCount} daily aggregates…</p>
              <Progress value={1} animated />
            </>
          )}

          {stage === "done" && (
            <>
              <p className="text-sm font-semibold">Imported {aggregateCount} days</p>
              <p className="text-xs text-text-secondary">Redirecting to dashboard…</p>
            </>
          )}

          {stage === "error" && (
            <>
              <p className="text-sm font-semibold text-danger">{error}</p>
              <p className="text-xs text-text-secondary">Tap to try a different file</p>
            </>
          )}

          <input
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>

        <p className="text-center text-[11px] text-text-tertiary">
          Re-uploading the same file is a no-op (idempotent). Your raw `.zip` is never stored on the server.
        </p>
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-canvas text-[10px] font-semibold">
        {n}
      </span>
      <span className="text-text-secondary">{children}</span>
    </li>
  );
}

function Progress({ value, animated }: { value: number; animated?: boolean }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-hairline">
      <div
        className={cn("h-full rounded-full bg-workout transition-[width]", animated && "animate-pulse")}
        style={{ width: `${value * 100}%` }}
      />
    </div>
  );
}
