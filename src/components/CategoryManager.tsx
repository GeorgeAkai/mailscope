"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type Category = {
  id: string;
  name: string;
  description: string | null;
  priority: number;
};

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/categories");
    if (res.ok) {
      setCategories(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories }),
    });
    if (res.ok) {
      setCategories(await res.json());
      setMessage("Saved. Non-manual emails are being re-triaged in the background.");
    } else {
      setMessage("Failed to save categories.");
    }
    setSaving(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, description: newDescription }),
    });
    if (res.ok) {
      setNewName("");
      setNewDescription("");
      await loadCategories();
      setMessage("Category added. Re-triaging emails in the background.");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? Emails will move to Other.")) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadCategories();
      setMessage("Category deleted.");
    }
  }

  function moveCategory(index: number, direction: -1 | 1) {
    const next = [...categories];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setCategories(
      next.map((cat, i) => ({
        ...cat,
        priority: i,
      })),
    );
  }

  function updateCategory(id: string, field: "name" | "description", value: string) {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, [field]: value } : cat)),
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">
          Category priority
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Higher categories appear first in your inbox. Emails sort by category rank,
          then AI importance score.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
          {message}
        </div>
      )}

      <ul className="space-y-3">
        {categories.map((cat, index) => (
          <li
            key={cat.id}
            className="glass flex flex-wrap items-start gap-3 rounded-xl p-4 transition hover:border-blue-500/20"
          >
            <div className="flex flex-col items-center gap-0.5 pt-1">
              <span className="mb-1 flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/15 text-xs font-bold text-blue-400">
                {index + 1}
              </span>
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveCategory(index, -1)}
                className="rounded p-1 text-slate-500 transition hover:bg-blue-500/10 hover:text-blue-400 disabled:opacity-20"
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === categories.length - 1}
                onClick={() => moveCategory(index, 1)}
                className="rounded p-1 text-slate-500 transition hover:bg-blue-500/10 hover:text-blue-400 disabled:opacity-20"
                aria-label="Move down"
              >
                ↓
              </button>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <input
                value={cat.name}
                onChange={(e) => updateCategory(cat.id, "name", e.target.value)}
                className="input-dark w-full rounded-lg px-3 py-2 text-sm font-medium"
              />
              <input
                value={cat.description ?? ""}
                onChange={(e) => updateCategory(cat.id, "description", e.target.value)}
                placeholder="Description helps the AI classify emails"
                className="input-dark w-full rounded-lg px-3 py-2 text-sm"
              />
            </div>
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
        className="btn-primary rounded-xl px-6 py-2.5 text-sm"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>

      <form
        onSubmit={handleAdd}
        className="glass rounded-2xl border-dashed p-6"
      >
        <h3 className="font-semibold text-slate-100">Add category</h3>
        <p className="mt-1 text-xs text-slate-500">
          New categories trigger a background re-triage of your emails.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
        </div>
        <button
          type="submit"
          disabled={saving || !newName.trim()}
          className={cn(
            "mt-4 rounded-xl px-5 py-2.5 text-sm font-medium transition",
            "bg-slate-800 text-slate-200 ring-1 ring-blue-500/20",
            "hover:bg-slate-700 hover:ring-blue-500/35 disabled:opacity-40",
          )}
        >
          Add category
        </button>
      </form>
    </div>
  );
}
