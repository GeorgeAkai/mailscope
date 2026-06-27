"use client";

import { useCallback, useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  isDefault: boolean;
};

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/categories");
    if (res.ok) setCategories(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    const res = await fetch("/api/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories }),
    });
    if (res.ok) {
      setCategories(await res.json());
      setStatus({ type: "success", msg: "Saved. Non-manual emails are being re-triaged in the background." });
    } else {
      setStatus({ type: "error", msg: "Failed to save categories." });
    }
    setSaving(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setStatus(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, description: newDescription }),
    });
    if (res.ok) {
      setNewName("");
      setNewDescription("");
      await loadCategories();
      setStatus({ type: "success", msg: "Category added. Re-triaging emails in the background." });
    } else {
      setStatus({ type: "error", msg: "Failed to add category." });
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? Emails will move to Other.")) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadCategories();
      setStatus({ type: "success", msg: "Category deleted." });
    }
  }

  function moveCategory(index: number, direction: -1 | 1) {
    const next = [...categories];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setCategories(next.map((cat, i) => ({ ...cat, priority: i })));
  }

  function updateCategory(id: string, field: "name" | "description", value: string) {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, [field]: value } : cat)),
    );
  }

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Categories
        </h2>
        <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
          The six defaults are a starting point — rename, reorder, add, or delete as needed.
          Higher categories appear first in your inbox.
        </p>
      </div>

      {status && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            status.type === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {status.msg}
        </div>
      )}

      <ul className="space-y-3">
        {categories.map((cat, index) => (
          <li
            key={cat.id}
            className="rounded-xl p-4 flex flex-wrap items-start gap-3 transition"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
            }}
          >
            {/* Rank + reorder */}
            <div className="flex flex-col items-center gap-0.5 pt-0.5">
              <span
                className="mb-1 flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold"
                style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent)" }}
              >
                {index + 1}
              </span>
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveCategory(index, -1)}
                className="rounded p-1 transition hover:bg-blue-500/10 disabled:opacity-20"
                style={{ color: "var(--text-muted)" }}
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === categories.length - 1}
                onClick={() => moveCategory(index, 1)}
                className="rounded p-1 transition hover:bg-blue-500/10 disabled:opacity-20"
                style={{ color: "var(--text-muted)" }}
                aria-label="Move down"
              >
                ↓
              </button>
            </div>

            {/* Fields */}
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  value={cat.name}
                  onChange={(e) => updateCategory(cat.id, "name", e.target.value)}
                  className="input-dark min-w-0 flex-1 rounded-lg px-3 py-2 text-sm font-medium"
                />
                {cat.isDefault && (
                  <span
                    className="shrink-0 rounded-md px-2 py-0.5 text-xs font-medium"
                    style={{
                      background: "rgba(99,102,241,0.1)",
                      color: "var(--text-muted)",
                      border: "1px solid rgba(99,102,241,0.2)",
                    }}
                  >
                    Default
                  </span>
                )}
              </div>
              <input
                value={cat.description ?? ""}
                onChange={(e) => updateCategory(cat.id, "description", e.target.value)}
                placeholder="Description helps the AI classify emails"
                className="input-dark w-full rounded-lg px-3 py-2 text-sm"
              />
            </div>

            {/* Delete */}
            <button
              type="button"
              onClick={() => handleDelete(cat.id)}
              className="rounded-lg px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="btn-primary rounded-xl px-5 py-2.5 text-sm w-full sm:w-auto"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>

      {/* Add category */}
      <div
        className="rounded-2xl p-6 space-y-4"
        style={{ border: "1px dashed var(--border-strong)", background: "var(--bg-card)" }}
      >
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Add category
          </h3>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
            New categories trigger a background re-triage of your emails.
          </p>
        </div>
        <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category name"
            className="input-dark rounded-lg px-3 py-2.5 text-sm"
          />
          <input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
            className="input-dark rounded-lg px-3 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={saving || !newName.trim()}
            className="btn-primary rounded-xl px-5 py-2.5 text-sm sm:col-span-2 w-full sm:w-auto disabled:opacity-40"
          >
            Add category
          </button>
        </form>
      </div>
    </div>
  );
}
