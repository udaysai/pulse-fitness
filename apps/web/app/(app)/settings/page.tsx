"use client";

import Link from "next/link";
import { Upload, LogOut, Trash2, ShieldCheck, Database } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ACCENT_HEX } from "@/lib/design/accents";
import { isSupabaseConfigured, isGeminiConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const supabaseReady = isSupabaseConfigured();
  const geminiReady = isGeminiConfigured();

  async function handleSignOut() {
    if (!supabaseReady) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Settings" subtitle="Account, data, and integrations." accentHex={ACCENT_HEX.recovery} />

      <div className="space-y-6 px-5 pt-4">
        {/* Status */}
        <section>
          <SectionHeader>Status</SectionHeader>
          <div className="rounded-[var(--radius-card)] border border-hairline bg-surface divide-y divide-hairline">
            <StatusRow label="Supabase" ok={supabaseReady} okLabel="Connected" failLabel="Not configured" />
            <StatusRow label="Gemini" ok={geminiReady} okLabel="Key set" failLabel="Not configured" />
          </div>
        </section>

        {/* Data */}
        <section>
          <SectionHeader>Data</SectionHeader>
          <div className="rounded-[var(--radius-card)] border border-hairline bg-surface divide-y divide-hairline">
            <Link href="/settings/import" className="block">
              <ActionRow icon={Upload} label="Import Apple Health" hint="Upload export.zip" />
            </Link>
            <ActionRow icon={Database} label="Export my data" hint="GDPR — JSON download (coming soon)" />
          </div>
        </section>

        {/* Privacy */}
        <section>
          <SectionHeader>Privacy</SectionHeader>
          <div className="rounded-[var(--radius-card)] border border-hairline bg-surface divide-y divide-hairline">
            <ActionRow icon={ShieldCheck} label="Consent settings" hint="What data is collected" />
            <ActionRow icon={Trash2} label="Delete my account" hint="30-day grace period" danger />
          </div>
        </section>

        {/* Account */}
        {supabaseReady && (
          <section>
            <SectionHeader>Account</SectionHeader>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-[var(--radius-card)] border border-hairline bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-raised"
            >
              <LogOut className="size-4 text-text-secondary" />
              <span className="text-sm">Sign out</span>
            </button>
          </section>
        )}

        <p className="pt-2 text-center text-[11px] text-text-tertiary">Pulse v0.1.0 · MIT</p>
      </div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 px-1 text-[11px] uppercase tracking-wider text-text-tertiary">{children}</p>
  );
}

function StatusRow({
  label,
  ok,
  okLabel,
  failLabel,
}: {
  label: string;
  ok: boolean;
  okLabel: string;
  failLabel: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm">{label}</span>
      <span
        className="inline-flex items-center gap-1.5 text-xs"
        style={{ color: ok ? ACCENT_HEX.nutrition : ACCENT_HEX.workout }}
      >
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: ok ? ACCENT_HEX.nutrition : ACCENT_HEX.workout }}
        />
        {ok ? okLabel : failLabel}
      </span>
    </div>
  );
}

function ActionRow({
  icon: Icon,
  label,
  hint,
  danger,
}: {
  icon: typeof Upload;
  label: string;
  hint?: string;
  danger?: boolean;
}) {
  return (
    <button className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-raised">
      <Icon className="size-4 text-text-secondary" />
      <div className="flex flex-1 flex-col">
        <span className={`text-sm ${danger ? "text-danger" : ""}`}>{label}</span>
        {hint && <span className="text-[11px] text-text-tertiary">{hint}</span>}
      </div>
    </button>
  );
}
