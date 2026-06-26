"use client";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type Provider = "openrouter" | "openai" | "anthropic" | "google";

const PROVIDERS: {
  id: Provider;
  name: string;
  tagline: string;
  free: boolean;
  steps: string[];
  url: string;
  urlLabel: string;
  keyFormat: string;
}[] = [
  {
    id: "openrouter",
    name: "OpenRouter",
    tagline: "Recommended — one key, 200+ models, free tier available",
    free: true,
    steps: [
      "Go to openrouter.ai and create a free account.",
      'Click your avatar → "Keys" → "Create key".',
      "Copy the key (starts with sk-or-v1-).",
      "Paste it in Settings → AI Engine below.",
    ],
    url: "https://openrouter.ai/settings/keys",
    urlLabel: "openrouter.ai/settings/keys",
    keyFormat: "sk-or-v1-…",
  },
  {
    id: "openai",
    name: "OpenAI",
    tagline: "GPT-4o, GPT-4o-mini — pay-as-you-go",
    free: false,
    steps: [
      "Go to platform.openai.com and sign in.",
      'Open the API section → "Create new secret key".',
      "Copy the key (starts with sk-).",
      "Paste it in Settings → AI Engine below.",
    ],
    url: "https://platform.openai.com/api-keys",
    urlLabel: "platform.openai.com/api-keys",
    keyFormat: "sk-…",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    tagline: "Claude Haiku / Sonnet — fast and capable",
    free: false,
    steps: [
      "Go to console.anthropic.com and sign in.",
      'Click "API Keys" → "Create Key".',
      "Copy the key (starts with sk-ant-).",
      "Paste it in Settings → AI Engine below.",
    ],
    url: "https://console.anthropic.com/settings/keys",
    urlLabel: "console.anthropic.com/settings/keys",
    keyFormat: "sk-ant-…",
  },
  {
    id: "google",
    name: "Google Gemini",
    tagline: "Gemini 2.0 Flash — generous free tier",
    free: true,
    steps: [
      "Go to aistudio.google.com and sign in.",
      'Click "Get API key" → "Create API key".',
      "Copy the key (starts with AIza).",
      "Paste it in Settings → AI Engine below.",
    ],
    url: "https://aistudio.google.com/app/apikey",
    urlLabel: "aistudio.google.com/app/apikey",
    keyFormat: "AIza…",
  },
];

export function GettingStartedGuide({ hasUserKey }: { hasUserKey: boolean }) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("mailscope-guide-dismissed") === "1";
  });
  const [active, setActive] = useState<Provider>("openrouter");

  if (dismissed || hasUserKey) return null;

  const provider = PROVIDERS.find((p) => p.id === active)!;

  return (
    <div className="glass rounded-2xl overflow-hidden mb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6"
        style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 ring-1 ring-blue-500/25 text-blue-400">
            <KeyIcon />
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Add an AI key to enable triage
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              MailScope needs an API key to classify your emails. Takes under 2 minutes.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            localStorage.setItem("mailscope-guide-dismissed", "1");
          }}
          className="shrink-0 rounded-lg p-1 transition hover:bg-slate-500/10"
          style={{ color: "var(--text-muted)" }}
          aria-label="Dismiss"
        >
          <XIcon />
        </button>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {/* Provider tabs */}
        <div className="flex flex-wrap gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActive(p.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ring-1",
                active === p.id
                  ? "bg-blue-500/15 text-blue-300 ring-blue-500/30"
                  : "ring-transparent hover:ring-slate-500/20",
              )}
              style={active !== p.id ? { color: "var(--text-muted)" } : {}}
            >
              {p.name}
              {p.free && (
                <span className="rounded px-1 py-px text-[10px] font-semibold bg-green-500/15 text-green-400">
                  free
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Selected provider steps */}
        <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{provider.name}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{provider.tagline}</p>
            </div>
            <a
              href={provider.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary shrink-0 rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5"
            >
              Open {provider.name}
              <ExternalIcon />
            </a>
          </div>

          <ol className="space-y-2">
            {provider.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-[11px] font-bold text-blue-400 ring-1 ring-blue-500/20">
                  {i + 1}
                </span>
                <span style={{ color: "var(--text-secondary)" }}>
                  {step}
                  {i === provider.steps.length - 1 && (
                    <> &nbsp;<Link href="/settings" className="text-blue-400 underline underline-offset-2 hover:text-blue-300">Go to Settings →</Link></>
                  )}
                </span>
              </li>
            ))}
          </ol>

          <p className="text-xs pt-1" style={{ color: "var(--text-muted)" }}>
            Key format: <code className="font-mono">{provider.keyFormat}</code>
          </p>
        </div>

        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Your key is stored only in your account and is never logged or shared.
          You can remove it at any time in Settings.
        </p>
      </div>
    </div>
  );
}

function KeyIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}
