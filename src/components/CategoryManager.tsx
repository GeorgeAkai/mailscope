"use client";

import { useCallback, useEffect, useState } from "react";

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

  if (loading) return <p className="text-zinc-500">Loading categories…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Category priority</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Higher categories appear first in your inbox. Emails are sorted by category, then
          importance score.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          {message}
        </div>
      )}

      <ul className="space-y-3">
        {categories.map((cat, index) => (
          <li
            key={cat.id}
            className="flex flex-wrap items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4"
          >
            <div className="flex flex-col gap-1">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveCategory(index, -1)}
                className="rounded px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === categories.length - 1}
                onClick={() => moveCategory(index, 1)}
                className="rounded px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
              >
                ↓
              </button>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <input
                value={cat.name}
                onChange={(e) => updateCategory(cat.id, "name", e.target.value)}
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
              />
              <input
                value={cat.description ?? ""}
                onChange={(e) => updateCategory(cat.id, "description", e.target.value)}
                placeholder="Description helps the AI classify emails"
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-600"
              />
            </div>
            <button
              type="button"
              onClick={() => handleDelete(cat.id)}
              className="rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      <form onSubmit={handleAdd} className="rounded-xl border border-dashed border-zinc-300 p-4">
        <h3 className="font-medium text-zinc-900">Add category</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category name"
            className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
          />
          <input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
            className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving || !newName.trim()}
          className="mt-3 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          Add category
        </button>
      </form>
    </div>
  );
}
