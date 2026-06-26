"use client";
import { useEffect } from "react";
import { categoryColors } from "@/lib/defaults";
import { cn } from "@/lib/cn";

export type EmailDetail = {
  id: string;
  gmailId: string;
  subject: string | null;
  fromAddress: string;
  fromName: string | null;
  bodyPreview: string | null;
  receivedAt: string;
  importanceScore: number;
  readAt: string | null;
  category: { id: string; name: string; priority: number } | null;
};

export function EmailDetailModal({
  email,
  onClose,
  onMarkRead,
}: {
  email: EmailDetail;
  onClose: () => void;
  onMarkRead: (id: string) => void;
}) {
  // Mark as read on open
  useEffect(() => {
    if (!email.readAt) {
      fetch(`/api/emails/${email.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markRead: true }),
      })
        .then(() => onMarkRead(email.id))
        .catch(console.error);
    }
    // Close on Escape
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email.id]);

  const colors = categoryColors(email.category?.name);
  const gmailLink = `https://mail.google.com/mail/u/0/#inbox/${email.gmailId}`;

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="glass-strong relative w-full max-w-2xl rounded-2xl shadow-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b p-5 sm:p-6"
          style={{ borderColor: "var(--border)" }}>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {email.category && (
                <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium ring-1", colors.badge, colors.ring)}>
                  {email.category.name}
                </span>
              )}
              <span className="rounded-md bg-slate-500/15 px-2 py-0.5 text-xs ring-1 ring-slate-500/20"
                style={{ color: "var(--text-muted)" }}>
                {email.importanceScore}/5
              </span>
            </div>
            <h2 className="text-base font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>
              {email.subject || "(no subject)"}
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {email.fromName ? (
                <><span style={{ color: "var(--text-primary)" }}>{email.fromName}</span> &lt;{email.fromAddress}&gt;</>
              ) : email.fromAddress}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
              {new Date(email.receivedAt).toLocaleString(undefined, {
                weekday: "short", month: "short", day: "numeric",
                hour: "numeric", minute: "2-digit",
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost shrink-0 rounded-lg p-1.5"
            aria-label="Close"
          >
            <XIcon />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6">
          {email.bodyPreview ? (
            <pre
              className="whitespace-pre-wrap break-words text-sm leading-relaxed font-sans"
              style={{ color: "var(--text-secondary)" }}
            >
              {email.bodyPreview}
            </pre>
          ) : (
            <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>
              No body content available.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-5 py-3 sm:px-6"
          style={{ borderColor: "var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Body may be truncated. Open in Gmail for the full message.
          </p>
          <a
            href={gmailLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"
          >
            Open in Gmail
            <ExternalIcon />
          </a>
        </div>
      </div>
    </div>
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
