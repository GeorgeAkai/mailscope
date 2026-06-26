export const DEFAULT_CATEGORIES = [
  {
    name: "Important",
    description:
      "Interview invites, job offers, security alerts, 2FA codes, subscription receipts, shopping orders, assignment deadlines, bank alerts, document submissions",
    priority: 0,
  },
  {
    name: "Benign",
    description:
      "Job application acknowledgements, generic account activity, software update notices, newsletters you signed up for",
    priority: 1,
  },
  {
    name: "SPAM",
    description:
      "Unsolicited promotions, mass marketing, cold outreach, lottery and prize notifications, unwanted bulk mail",
    priority: 2,
  },
  {
    name: "Suspicious",
    description:
      "Potential phishing, urgent credential or money requests, sender domain mismatch, suspicious urgency, requests to verify accounts via unknown links",
    priority: 3,
  },
] as const;

export const SYNC_DAY_OPTIONS = [7, 30, 90] as const;
export type SyncDays = (typeof SYNC_DAY_OPTIONS)[number];
