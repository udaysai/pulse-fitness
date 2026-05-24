"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { isSupabaseConfigured } from "@/lib/env";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  async function handleGoogleSignIn() {
    if (!configured) {
      setError("Supabase isn't configured yet. See README setup steps.");
      return;
    }
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    }
  }

  return (
    <main
      className="halo flex min-h-dvh flex-col items-center justify-center gap-8 p-6"
      style={{ ["--halo-color" as string]: "#e85d4a" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        className="flex flex-col items-center gap-2"
      >
        <div className="size-12 rounded-2xl bg-workout/15 grid place-items-center">
          <div className="size-4 rounded-full bg-workout" />
        </div>
        <h1 className="text-3xl font-semibold">Pulse</h1>
        <p className="text-sm text-text-secondary text-center max-w-xs">
          Your AI fitness companion. Personalized plans from your Apple Health data.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-xs flex flex-col gap-3"
      >
        <PrimaryButton onClick={handleGoogleSignIn} className="w-full">
          <GoogleIcon /> Continue with Google
        </PrimaryButton>

        {!configured && (
          <p className="text-center text-xs text-text-tertiary">
            Setup needed — fill <code className="rounded bg-surface px-1">.env.local</code> with Supabase keys.
          </p>
        )}
        {error && <p className="text-center text-xs text-danger">{error}</p>}

        <p className="mt-2 text-center text-[11px] text-text-tertiary">
          By continuing you accept our terms. Your data is never sold or used for advertising.
        </p>
      </motion.div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4">
      <path
        fill="#fff"
        d="M21.35 11.1H12v3.4h5.35c-.23 1.4-1.62 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.45l2.57-2.48C16.78 4.18 14.62 3.2 12 3.2 6.97 3.2 2.9 7.27 2.9 12.3s4.07 9.1 9.1 9.1c5.26 0 8.74-3.7 8.74-8.9 0-.6-.07-1.06-.15-1.4z"
      />
    </svg>
  );
}
