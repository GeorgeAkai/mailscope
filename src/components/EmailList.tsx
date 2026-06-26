"use client";

import { useCallback, useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
  priority: number;
};

type Email = {
  id: string;
  subject: string | null;
  fromAddress: string;
  fromName: string | null;
  snippet: string | null;
  receivedAt: string;
  importanceScore: number;
  userOverride: boolean;
  category: Category | null;
};

export function EmailList() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEmails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url =
        filter === "all" ? "/api/emails" : `/api/emails?categoryId=${filter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load emails");
      const data = (await res.json()) as { emails: Email[]; categories: Category[] };
      setEmails(data.emails);
      setCategories(data.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      await loadEmails();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleRecategorize(emailId: string, categoryId: string) {
    const res = await fetch(`/api/emails/${emailId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId }),
    });
    if (res.ok) await loadEmails();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
            All
          </FilterButton>
          {categories.map((cat) => (
            <FilterButton
              key={cat.id}
              active={filter === cat.id}
              onClick={() => setFilter(cat.id)}
            >
              {cat.name}
            </FilterButton>
          ))}
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Sync now"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-zinc-500">Loading emails…</p>
      ) : emails.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
          <p className="text-zinc-600">No emails yet. Click &quot;Sync now&quot; to fetch your inbox.</p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {emails.map((email) => (
            <li key={email.id} className="px-5 py-4 transition hover:bg-zinc-50">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ImportanceBadge score={email.importanceScore} />
                    {email.category && (
                      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                        {email.category.name}
                      </span>
                    )}
                    {email.userOverride && (
                      <span className="text-xs text-amber-600">Manual</span>
                    )}
                  </div>
                  <h3 className="mt-1 truncate font-medium text-zinc-900">
                    {email.subject || "(no subject)"}
                  </h3>
                  <p className="text-sm text-zinc-600">
                    {email.fromName ? `${email.fromName} · ` : ""}
                    {email.fromAddress}
                  </p>
                  {email.snippet && (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{email.snippet}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <time className="text-xs text-zinc-400">
                    {new Date(email.receivedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                  <select
                    value={email.category?.id ?? ""}
                    onChange={(e) => handleRecategorize(email.id, e.target.value)}
                    className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-700"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-indigo-600 text-white"
          : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
      }`}
    >
      {children}
    </button>
  );
}

function ImportanceBadge({ score }: { score: number }) {
  const colors: Record<number, string> = {
    5: "bg-red-100 text-red-700",
    4: "bg-orange-100 text-orange-700",
    3: "bg-yellow-100 text-yellow-700",
    2: "bg-blue-100 text-blue-700",
    1: "bg-zinc-100 text-zinc-600",
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors[score] ?? colors[3]}`}
    >
      {score}/5
    </span>
  );
}
