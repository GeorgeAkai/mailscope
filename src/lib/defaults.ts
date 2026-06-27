export const DEFAULT_CATEGORIES = [
  {
    name: "Important",
    description:
      "Interview invites, job offers, security alerts, 2FA codes, subscription receipts, shopping orders, bank alerts, urgent personal emails",
    priority: 0,
  },
  {
    name: "Tasks",
    description:
      "Emails with clear action items: assignment deadlines, meeting requests, document submissions, form completions, RSVPs, follow-up requests",
    priority: 1,
  },
  {
    name: "Benign",
    description:
      "Job application acknowledgements, generic account activity, software update notices, newsletters you signed up for, non-urgent FYI emails",
    priority: 2,
  },
  {
    name: "SPAM",
    description:
      "Unsolicited promotions, mass marketing, cold outreach, lottery and prize notifications, unwanted bulk mail",
    priority: 3,
  },
  {
    name: "Suspicious",
    description:
      "Unusual sender patterns, unexpected account warnings, requests to verify credentials via links from unfamiliar senders, urgency that seems manufactured",
    priority: 4,
  },
  {
    name: "Phishing",
    description:
      "Confirmed phishing: impersonating banks/services/brands, fake login pages, credential harvesting, spoofed sender addresses, fake security alerts demanding immediate action on suspicious links",
    priority: 5,
  },
] as const;

export type CategoryName = (typeof DEFAULT_CATEGORIES)[number]["name"];

export const CATEGORY_COLORS: Record<
  string,
  { bar: string; badge: string; ring: string; dot: string }
> = {
  Important: {
    bar: "bg-blue-500",
    badge: "bg-blue-500/15 text-blue-400",
    ring: "ring-blue-500/30",
    dot: "bg-blue-500",
  },
  Tasks: {
    bar: "bg-green-500",
    badge: "bg-green-500/15 text-green-400",
    ring: "ring-green-500/30",
    dot: "bg-green-500",
  },
  Benign: {
    bar: "bg-amber-500",
    badge: "bg-amber-500/15 text-amber-400",
    ring: "ring-amber-500/30",
    dot: "bg-amber-500",
  },
  SPAM: {
    bar: "bg-slate-500",
    badge: "bg-slate-500/15 text-slate-400",
    ring: "ring-slate-500/30",
    dot: "bg-slate-400",
  },
  Suspicious: {
    bar: "bg-orange-500",
    badge: "bg-orange-500/15 text-orange-400",
    ring: "ring-orange-500/30",
    dot: "bg-orange-500",
  },
  Phishing: {
    bar: "bg-red-500",
    badge: "bg-red-500/15 text-red-400",
    ring: "ring-red-500/30",
    dot: "bg-red-500",
  },
};

export function categoryColors(name: string | null | undefined) {
  return (
    CATEGORY_COLORS[name ?? ""] ?? {
      bar: "bg-slate-600",
      badge: "bg-slate-500/15 text-slate-400",
      ring: "ring-slate-500/30",
      dot: "bg-slate-500",
    }
  );
}

export const SYNC_DAY_OPTIONS = [7, 30, 90] as const;
export type SyncDays = (typeof SYNC_DAY_OPTIONS)[number];

export const SYNC_INTERVAL_OPTIONS = [
  { value: 0,  label: "Manual only" },
  { value: 1,  label: "Every hour" },
  { value: 4,  label: "Every 4 hours" },
  { value: 12, label: "Every 12 hours" },
  { value: 24, label: "Once a day" },
] as const;

export type SyncIntervalHours = (typeof SYNC_INTERVAL_OPTIONS)[number]["value"];
