"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";

export function DangerZone() {
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error("Deletion failed");
      await signOut({ callbackUrl: "/" });
    } catch {
      setError("Failed to delete account. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-2xl p-6 space-y-4" style={{ border: "1px solid rgba(239,68,68,0.2)", background: "var(--bg-card)" }}>
      <div>
        <h2 className="text-base font-semibold text-red-400">Danger Zone</h2>
        <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
      </div>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-xl px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
          style={{ border: "1px solid rgba(239,68,68,0.3)" }}
        >
          Delete account
        </button>
      ) : (
        <div className="space-y-3 rounded-xl p-4" style={{ border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.05)" }}>
          <p className="text-sm font-medium text-red-400">This will permanently delete:</p>
          <ul className="space-y-1 text-sm list-disc list-inside" style={{ color: "var(--text-muted)" }}>
            <li>Your account and profile</li>
            <li>All synced emails and categories</li>
            <li>All extracted tasks</li>
            <li>Your API key configuration</li>
          </ul>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="input-dark w-full rounded-lg px-3 py-2 text-sm font-mono"
            autoComplete="off"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDelete}
              disabled={confirmText !== "DELETE" || deleting}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-40"
            >
              {deleting ? "Deleting…" : "Yes, delete everything"}
            </button>
            <button
              type="button"
              onClick={() => { setConfirming(false); setConfirmText(""); setError(null); }}
              disabled={deleting}
              className="btn-ghost rounded-xl px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
