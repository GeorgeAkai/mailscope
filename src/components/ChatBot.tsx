"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Message = { role: "user" | "assistant"; content: string };

const WELCOME_MESSAGE =
  "Hi! I'm your MailScope assistant. Ask me anything about your inbox — I can find emails, summarize threads, surface deadlines, or flag anything suspicious.\n\nTry: \"Do I have any upcoming tasks?\" or \"Show me recent emails from Google.\"";

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      setMessages([
        ...next,
        {
          role: "assistant",
          content: data.reply ?? data.error ?? "Something went wrong.",
        },
      ]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Network error. Please try again." },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 shadow-lg ring-1 ring-blue-500/40 transition hover:bg-blue-500 hover:shadow-blue-500/30"
        aria-label="Toggle email assistant"
      >
        {open ? (
          <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-22 right-4 z-50 flex w-[calc(100vw-2rem)] flex-col rounded-2xl shadow-2xl sm:right-6 sm:w-96"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-strong)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 rounded-t-2xl px-4 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 ring-1 ring-blue-500/25 text-blue-400">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Email Assistant
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Ask anything about your inbox
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex h-80 flex-col gap-3 overflow-y-auto p-4">
            {/* Welcome bubble — always shown, not sent to API */}
            <AssistantBubble content={WELCOME_MESSAGE} />

            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-relaxed",
                  m.role === "user"
                    ? "ml-auto bg-blue-600 text-white"
                    : "",
                )}
                style={
                  m.role === "assistant"
                    ? { background: "var(--bg-card-hover)", color: "var(--text-secondary)" }
                    : {}
                }
              >
                {m.content}
              </div>
            ))}

            {loading && (
              <div
                className="flex max-w-[85%] items-center gap-1.5 rounded-xl px-3 py-3"
                style={{ background: "var(--bg-card-hover)" }}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full"
                    style={{ background: "var(--text-muted)", animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about your emails…"
                rows={1}
                className="input-dark flex-1 resize-none rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ maxHeight: "6rem", overflowY: "auto" }}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 transition hover:bg-blue-500 disabled:opacity-40"
                aria-label="Send"
              >
                <svg className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AssistantBubble({ content }: { content: string }) {
  return (
    <div
      className="max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-relaxed"
      style={{ background: "var(--bg-card-hover)", color: "var(--text-secondary)" }}
    >
      {content}
    </div>
  );
}
