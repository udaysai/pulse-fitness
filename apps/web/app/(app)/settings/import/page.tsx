"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileArchive, CheckCircle2, Share, Smartphone, Watch, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
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
      const { parseAppleHealthExport } = await import("@/lib/health/parser");
      const result = await parseAppleHealthExport(file, (p) => {
        setProgress(p.totalBytes ? p.bytesProcessed / p.totalBytes : 0);
        setRecords(p.recordsParsed);
      });
      setAggregateCount(result.aggregates.length);
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
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
      setStage("error");
    }
  }

  return (
    <div className="mx-auto max-w-md pb-24">
      <PageHeader title="Sync Apple Watch data" subtitle="One-time setup, weekly refresh." accentHex={ACCENT_HEX.workout} />

      <div className="space-y-5 px-5 pt-4">
        <Link href="/settings" className="inline-flex items-center gap-1 text-xs text-text-secondary">
          <ArrowLeft className="size-3" /> Settings
        </Link>

        {/* Why this is manual */}
        <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-tertiary">
            <Watch className="size-3" /> Why manual?
          </p>
          <p className="text-xs text-text-secondary leading-relaxed">
            Apple doesn't let websites read Health data directly — only native iOS apps can,
            and only with their $99/year Developer fee. The good news: Apple's built-in export
            captures everything your watch tracked, and your data stays on your device until
            you choose to upload daily aggregates here. <strong className="text-text-primary">Raw samples never leave your phone.</strong>
          </p>
        </div>

        {/* Step-by-step */}
        <div>
          <p className="mb-2 px-1 text-[11px] uppercase tracking-wider text-text-tertiary">How to export</p>
          <ol className="space-y-3">
            <Step n={1} icon={Smartphone} title="Open the Health app on your iPhone">
              The white app with a red heart icon — already installed by default.
            </Step>
            <Step n={2} icon={Smartphone} title="Tap your profile photo (top-right)">
              Or your initials if you don't have a photo.
            </Step>
            <Step n={3} icon={Share} title='Scroll down and tap "Export All Health Data"'>
              Confirm in the dialog. Takes 15–60 seconds depending on how much history you have.
            </Step>
            <Step n={4} icon={Share} title="Share to yourself">
              AirDrop to your Mac (fastest), email to yourself, or save to Files. You'll get a file called <code className="rounded bg-canvas px-1">export.zip</code>.
            </Step>
            <Step n={5} icon={FileArchive} title="Upload it below">
              Drag onto the box, or tap to pick. The parsing happens entirely in your browser.
            </Step>
          </ol>
        </div>

        {/* What we extract */}
        <details className="rounded-[var(--radius-card)] border border-hairline bg-surface">
          <summary className="flex cursor-pointer items-center justify-between p-3 text-sm list-none">
            <span>What data we extract</span>
            <ChevronRight className="size-4 text-text-tertiary transition-transform group-open:rotate-90" />
          </summary>
          <ul className="space-y-1.5 border-t border-hairline px-3 pb-3 pt-2 text-xs text-text-secondary">
            <DataPoint label="Steps" what="Daily total" />
            <DataPoint label="Active calories" what="Daily sum from move ring" />
            <DataPoint label="Resting heart rate" what="One number per day" />
            <DataPoint label="HRV (Heart Rate Variability)" what="Daily average, ms" />
            <DataPoint label="Sleep" what="Total minutes asleep" />
            <DataPoint label="VO₂ max" what="From cardio fitness estimate" />
            <DataPoint label="Body weight" what="If you logged it in Health" />
            <DataPoint label="Body fat %" what="If you have a smart scale connected" />
          </ul>
        </details>

        {/* Cadence */}
        <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-4 text-xs text-text-secondary leading-relaxed">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-text-tertiary">How often</p>
          <p>
            Do this <strong className="text-text-primary">once a week</strong> (Sunday evening works well).
            Re-uploading the same file is a safe no-op — only NEW days get added.
          </p>
        </div>

        {/* Dropzone */}
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
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
          {stage === "done" ? <CheckCircle2 className="size-10 text-nutrition" /> : <FileArchive className="size-10 text-text-secondary" />}
          {stage === "idle" && (
            <>
              <p className="text-sm font-semibold">Drop export.zip here</p>
              <p className="text-xs text-text-secondary">or tap to pick a file</p>
            </>
          )}
          {stage === "parsing" && (
            <>
              <p className="text-sm font-semibold">Parsing your file…</p>
              <p className="text-xs text-text-secondary">{records.toLocaleString()} records · {(progress * 100).toFixed(0)}%</p>
              <Bar value={progress} />
            </>
          )}
          {stage === "uploading" && (
            <>
              <p className="text-sm font-semibold">Uploading {aggregateCount} days of metrics…</p>
              <Bar value={1} animated />
            </>
          )}
          {stage === "done" && (
            <>
              <p className="text-sm font-semibold">Imported {aggregateCount} days ✓</p>
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
          Your raw `.zip` is never stored on the server — only the daily aggregates are saved.
        </p>
      </div>
    </div>
  );
}

function Step({ n, icon: Icon, title, children }: { n: number; icon: typeof Smartphone; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 rounded-[var(--radius-card)] border border-hairline bg-surface p-3">
      <div className="flex flex-col items-center gap-1">
        <span className="metric grid size-6 place-items-center rounded-full bg-workout text-[10px] font-semibold text-white">{n}</span>
        <Icon className="size-3.5 text-text-tertiary" />
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-[11px] text-text-secondary leading-relaxed">{children}</p>
      </div>
    </li>
  );
}

function DataPoint({ label, what }: { label: string; what: string }) {
  return (
    <li className="flex justify-between gap-3">
      <span className="text-text-primary">{label}</span>
      <span className="text-text-tertiary">{what}</span>
    </li>
  );
}

function Bar({ value, animated }: { value: number; animated?: boolean }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-hairline">
      <div className={cn("h-full rounded-full bg-workout transition-[width]", animated && "animate-pulse")} style={{ width: `${value * 100}%` }} />
    </div>
  );
}
