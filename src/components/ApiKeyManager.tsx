"use client";
import { useEffect, useState } from "react";
import { DEFAULT_MODELS, PROVIDER_NAMES, type AIProvider } from "@/lib/ai-providers";

const PROVIDERS: { value: AIProvider; label: string; placeholder: string }[] = [
  { value: "openrouter", label: "OpenRouter", placeholder: "sk-or-v1-…" },
  { value: "openai", label: "OpenAI", placeholder: "sk-…" },
  { value: "anthropic", label: "Anthropic", placeholder: "sk-ant-…" },
  { value: "google", label: "Google Gemini", placeholder: "AIza…" },
];

type Config = {
  provider: AIProvider | null;
  hasKey: boolean;
  keyPreview: string | null;
  model: string | null;
};

export function ApiKeyManager() {
  const [config, setConfig] = useState<Config | null>(null);
  const [provider, setProvider] = useState<AIProvider>("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings/apikey", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: Config) => {
        setConfig(data);
        if (data.provider) setProvider(data.provider);
        if (data.model) setModel(data.model);
      })
      .catch(console.error);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) { setStatus({ type: "error", msg: "Enter your API key" }); return; }
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/settings/apikey", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, model: model || DEFAULT_MODELS[provider] }),
      });
      if (!res.ok) throw new Error("Save failed");
      setConfig({ provider, hasKey: true, keyPreview: `${apiKey.slice(0, 6)}…`, model: model || DEFAULT_MODELS[provider] });
      setApiKey("");
      setStatus({ type: "success", msg: "API key saved. New syncs will use this key." });
    } catch {
      setStatus({ type: "error", msg: "Failed to save. Try again." });
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    setStatus(null);
    try {
      await fetch("/api/settings/apikey", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear: true }),
      });
      setConfig({ provider: null, hasKey: false, keyPreview: null, model: null });
      setApiKey("");
      setModel("");
      setProvider("openrouter");
      setStatus({ type: "success", msg: "Key revoked. Paste a new key below to re-enable AI triage." });
    } catch {
      setStatus({ type: "error", msg: "Failed to clear key." });
    } finally {
      setSaving(false);
    }
  }

  const selectedProvider = PROVIDERS.find((p) => p.value === provider)!;

  return (
    <div className="glass rounded-2xl p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          AI Engine
        </h2>
        <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
          Bring your own API key. Supports OpenRouter, OpenAI, Anthropic, and Google Gemini.
        </p>
      </div>

      {config && !config.hasKey && (
        <div
          className="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: "rgba(234,179,8,0.3)",
            background: "rgba(234,179,8,0.05)",
          }}
        >
          <span className="mt-0.5 shrink-0 text-yellow-400">⚠</span>
          <p style={{ color: "var(--text-secondary)" }}>
            No API key configured — emails are being triaged using{" "}
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>
              basic keyword rules
            </span>
            . Results may be less accurate than AI triage. Add a key below to enable
            full AI-powered classification.
          </p>
        </div>
      )}

      {config?.hasKey && (
        <div className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
          <span style={{ color: "var(--text-secondary)" }}>
            Active: <span className="font-medium" style={{ color: "var(--text-primary)" }}>
              {PROVIDER_NAMES[config.provider!]}
            </span>
            {" · "}
            <span className="font-mono">{config.keyPreview}</span>
            {config.model && (
              <> · <span style={{ color: "var(--text-muted)" }}>{config.model}</span></>
            )}
          </span>
          <button type="button" onClick={handleClear} disabled={saving}
            className="text-xs text-red-400 hover:text-red-300 transition disabled:opacity-50">
            Revoke key
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Provider
          </label>
          <select
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value as AIProvider);
              setModel("");
            }}
            className="input-dark w-full rounded-lg px-3 py-2 text-sm"
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={selectedProvider.placeholder}
              className="input-dark w-full rounded-lg px-3 py-2 pr-10 text-sm font-mono"
              autoComplete="off"
            />
            <button type="button" onClick={() => setShowKey((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs"
              style={{ color: "var(--text-muted)" }}>
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Model <span style={{ color: "var(--text-muted)" }}>(optional)</span>
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={DEFAULT_MODELS[provider]}
            className="input-dark w-full rounded-lg px-3 py-2 text-sm font-mono"
          />
        </div>

        {status && (
          <p className={`text-sm rounded-lg px-3 py-2 ${
            status.type === "success"
              ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/20"
              : "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
          }`}>
            {status.msg}
          </p>
        )}

        <button type="submit" disabled={saving} className="btn-primary rounded-xl px-5 py-2.5 text-sm w-full sm:w-auto">
          {saving ? "Saving…" : "Save key"}
        </button>
      </form>
    </div>
  );
}
