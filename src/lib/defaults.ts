export const DEFAULT_CATEGORIES = [
  {
    name: "Job",
    description: "Recruiting, interviews, job applications, career opportunities",
    priority: 0,
  },
  {
    name: "Other",
    description: "Personal, transactional, and general correspondence",
    priority: 1,
  },
  {
    name: "Spam",
    description: "Promotions, newsletters, marketing, junk, and low-value bulk mail",
    priority: 2,
  },
] as const;

export const SYNC_DAY_OPTIONS = [7, 30, 90] as const;
export type SyncDays = (typeof SYNC_DAY_OPTIONS)[number];
