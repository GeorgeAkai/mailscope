"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SYNC_DAY_OPTIONS } from "@/lib/defaults";

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
    <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Set up your inbox</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Choose how far back to scan your Gmail inbox on first sync. Emails are classified
          with AI into categories you can customize later.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-zinc-700">Scan window</legend>
        {SYNC_DAY_OPTIONS.map((days) => (
          <label
            key={days}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
              syncDays === days
                ? "border-indigo-500 bg-indigo-50"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <input
              type="radio"
              name="syncDays"
              value={days}
              checked={syncDays === days}
              onChange={() => setSyncDays(days)}
              className="text-indigo-600"
            />
            <span className="text-sm font-medium text-zinc-900">Last {days} days</span>
          </label>
        ))}
      </fieldset>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
      >
        {loading ? "Starting sync…" : "Start scanning"}
      </button>
    </form>
  );
}
