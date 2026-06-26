"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SYNC_DAY_OPTIONS } from "@/lib/defaults";
import { cn } from "@/lib/cn";

export function OnboardForm() {
  const [syncDays, setSyncDays] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syncDays }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Setup failed");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-lg space-y-8">
      <div className="text-center sm:text-left">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
          Step 1 of 1
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">
          Set up your inbox
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Choose how far back to scan Gmail on first sync. AI will classify emails
          into categories you can customize anytime.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Scan window
        </legend>
        {SYNC_DAY_OPTIONS.map((days) => (
          <label
            key={days}
            className={cn(
              "flex cursor-pointer items-center gap-4 rounded-xl border px-5 py-4 transition",
              syncDays === days
                ? "border-blue-500/50 bg-blue-500/10 glow-blue"
                : "border-blue-500/10 bg-[var(--bg-card)] hover:border-blue-500/25 hover:bg-[var(--bg-card-hover)]",
            )}
          >
            <input
              type="radio"
              name="syncDays"
              value={days}
              checked={syncDays === days}
              onChange={() => setSyncDays(days)}
              className="h-4 w-4 border-blue-500/30 bg-slate-900 text-blue-500 focus:ring-blue-500/30"
            />
            <div>
              <span className="font-medium text-slate-100">Last {days} days</span>
              <p className="text-xs text-slate-500">
                {days === 7 && "Quick start — recent mail only"}
                {days === 30 && "Recommended — good balance"}
                {days === 90 && "Deep scan — more history"}
              </p>
            </div>
          </label>
        ))}
      </fieldset>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full rounded-xl px-4 py-3.5 text-sm font-medium"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Starting sync…
          </span>
        ) : (
          "Start scanning"
        )}
      </button>
    </form>
  );
}
