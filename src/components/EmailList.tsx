"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";

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
      const res = await fetch(url, { cache: "no-store" });
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
            {!loading && filter === "all" && (
              <span className="ml-1.5 text-blue-300/70">{emails.length}</span>
            )}
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
          className="btn-primary flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm"
        >
          {syncing ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Syncing…
            </>
          ) : (
            <>
              <SyncIcon />
              Sync now
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      ) : emails.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center rounded-2xl border-dashed px-6 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
            <InboxIcon />
          </div>
          <p className="font-medium text-slate-300">No emails yet</p>
          <p className="mt-1 max-w-xs text-sm text-slate-500">
            Click &quot;Sync now&quot; to fetch and triage your Gmail inbox.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {emails.map((email) => (
            <EmailCard
              key={email.id}
              email={email}
              categories={categories}
              onRecategorize={handleRecategorize}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function EmailCard({
  email,
  categories,
  onRecategorize,
}: {
  email: Email;
  categories: Category[];
  onRecategorize: (id: string, categoryId: string) => void;
}) {
  const accent = importanceAccent(email.importanceScore);

  return (
    <li
      className={cn(
        "group glass overflow-hidden rounded-xl transition",
        "hover:border-blue-500/25 hover:bg-[var(--bg-card-hover)]",
      )}
    >
      <div className="flex">
        <div className={cn("w-1 shrink-0", accent.bar)} />
        <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <ImportanceBadge score={email.importanceScore} />
              {email.category && (
                <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-300 ring-1 ring-blue-500/20">
                  {email.category.name}
                </span>
              )}
              {email.userOverride && (
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400 ring-1 ring-amber-500/20">
                  Manual
                </span>
              )}
            </div>
            <h3 className="mt-2 truncate font-medium text-slate-100 group-hover:text-white">
              {email.subject || "(no subject)"}
            </h3>
            <p className="mt-0.5 text-sm text-slate-400">
              {email.fromName ? (
                <>
                  <span className="text-slate-300">{email.fromName}</span>
                  <span className="mx-1.5 text-slate-600">·</span>
                </>
              ) : null}
              {email.fromAddress}
            </p>
            {email.snippet && (
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500">
                {email.snippet}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2.5">
            <time className="text-xs font-medium text-slate-500">
              {new Date(email.receivedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </time>
            <select
              value={email.category?.id ?? ""}
              onChange={(e) => onRecategorize(email.id, e.target.value)}
              className="input-dark cursor-pointer rounded-lg px-2.5 py-1.5 text-xs"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </li>
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
      className={cn(
        "rounded-lg px-3.5 py-2 text-sm font-medium transition",
        active
          ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30"
          : "text-slate-400 ring-1 ring-blue-500/10 hover:bg-blue-500/8 hover:text-slate-200",
      )}
    >
      {children}
    </button>
  );
}

function importanceAccent(score: number) {
  const map: Record<number, { bar: string; badge: string }> = {
    5: { bar: "bg-red-500", badge: "bg-red-500/15 text-red-400 ring-red-500/30" },
    4: { bar: "bg-orange-500", badge: "bg-orange-500/15 text-orange-400 ring-orange-500/30" },
    3: { bar: "bg-blue-500", badge: "bg-blue-500/15 text-blue-300 ring-blue-500/30" },
    2: { bar: "bg-slate-500", badge: "bg-slate-500/15 text-slate-400 ring-slate-500/30" },
    1: { bar: "bg-slate-700", badge: "bg-slate-700/30 text-slate-500 ring-slate-600/30" },
  };
  return map[score] ?? map[3];
}

function ImportanceBadge({ score }: { score: number }) {
  const accent = importanceAccent(score);
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-xs font-bold ring-1",
        accent.badge,
      )}
    >
      {score}/5
    </span>
  );
}

function SyncIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.012-.447-.037-.666A48.394 48.394 0 0012 15c-2.305 0-4.47-.402-6.39-1.137a48.52 48.52 0 01-.037-.666V13.5" />
    </svg>
  );
}
