"use client";

import { useEffect, useState } from "react";
import { SYNC_DAY_OPTIONS, SYNC_INTERVAL_OPTIONS } from "@/lib/defaults";

type SyncConfig = {
  syncDays: number;
  syncIntervalHours: number;
  lastSyncedAt: string | null;
};

export function SyncSettings() {
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [syncDays, setSyncDays] = useState<number>(30);
  const [syncIntervalHours, setSyncIntervalHours] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings/sync", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: SyncConfig) => {
        setConfig(data);
        setSyncDays(data.syncDays);
        setSyncIntervalHours(data.syncIntervalHours);
      })
      .catch(console.error);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/settings/sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncDays, syncIntervalHours }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as SyncConfig;
      setConfig(data);
      setStatus({ type: "success", msg: "Sync preferences saved." });
    } catch {
      setStatus({ type: "error", msg: "Failed to save. Try again." });
    } finally {
      setSaving(false);
    }
  }

  function formatLastSynced(iso: string | null): string {
    if (!iso) return "Never";
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }

  return (
    <div className="glass rounded-2xl p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Sync Preferences
        </h2>
        <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
          Control how far back MailScope scans and how often it checks for new mail.
        </p>
      </div>

      {config?.lastSyncedAt !== undefined && (
        <div
          className="flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
        >
          <span style={{ color: "var(--text-muted)" }}>Last synced</span>
          <span className="font-medium" style={{ color: "var(--text-primary)" }}>
            {formatLastSynced(config.lastSyncedAt)}
          </span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            Scan window
          </label>
          <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
            How many days of Gmail history to include. Takes effect on next sync.
          </p>
          <div className="flex flex-wrap gap-2">
            {SYNC_DAY_OPTIONS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setSyncDays(days)}
                className="rounded-lg px-4 py-2 text-sm font-medium transition"
                style={
                  syncDays === days
                    ? { background: "var(--accent)", color: "#fff" }
                    : {
                        background: "var(--bg-elevated)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border)",
                      }
                }
              >
                {days} days
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            Auto-sync frequency
          </label>
          <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
            How often the background job syncs your inbox. &quot;Manual only&quot; disables auto-sync.
          </p>
          <select
            value={syncIntervalHours}
            onChange={(e) => setSyncIntervalHours(Number(e.target.value))}
            className="input-dark w-full rounded-lg px-3 py-2 text-sm"
          >
            {SYNC_INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {status && (
          <p
            className={`text-sm rounded-lg px-3 py-2 ${
              status.type === "success"
                ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/20"
                : "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
            }`}
          >
            {status.msg}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="btn-primary rounded-xl px-5 py-2.5 text-sm w-full sm:w-auto"
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
      </form>
    </div>
  );
}
