// Rule-based email classifier used when no AI key is configured.
//
// Design principle: check Important before SPAM. Transactional emails
// (receipts, invoices, OTP codes, order confirmations) routinely contain
// unsubscribe links and promotional footers, so accumulated SPAM points must
// never drown out a clear Important signal.
//
// Decision order:
//   1. Phishing  (untrusted sender only, score ≥ threshold)
//   2. Suspicious (untrusted sender only, score ≥ threshold)
//   3. Important  (score ≥ IMPORTANT_THRESHOLD  →  bypass SPAM check entirely)
//   4. Tasks      (score ≥ TASKS_THRESHOLD)
//   5. SPAM       (score ≥ SPAM_THRESHOLD)
//   6. Benign

type TriageInput = {
  subject: string;
  fromAddress: string;
  fromName: string | null;
  snippet: string;
  bodyPreview: string;
};

type TriageResult = {
  categoryName: string;
  importanceScore: number;
};

type Scores = {
  phishing: number;
  suspicious: number;
  important: number;
  tasks: number;
  spam: number;
};

// Thresholds
const PHISHING_THRESHOLD   = 5;
const SUSPICIOUS_THRESHOLD = 4;
const IMPORTANT_THRESHOLD  = 6;   // single strong signal clears this
const TASKS_THRESHOLD      = 4;
const SPAM_THRESHOLD       = 5;

// ── Trusted sender bypass ────────────────────────────────────────────────────
// Emails from these domains never get flagged as Phishing/Suspicious.
const TRUSTED_DOMAINS = new Set([
  "google.com", "gmail.com", "googlemail.com",
  "accounts.google.com", "mail.google.com",
  "github.com", "github.io",
  "microsoft.com", "outlook.com", "hotmail.com", "live.com",
  "apple.com", "icloud.com", "me.com",
  "amazon.com", "amazon.co.uk", "amazon.ca",
  "paypal.com",
  "linkedin.com",
  "twitter.com", "x.com",
  "facebook.com", "instagram.com", "meta.com",
  "stripe.com",
  "slack.com",
  "zoom.us",
  "dropbox.com",
  "notion.so",
  "shopify.com",
  "cloudflare.com",
  "netlify.com",
  "vercel.com",
  "heroku.com",
  "twilio.com",
  "sendgrid.com",
  "mailchimp.com",
]);

// TLDs used almost exclusively by spam/throwaway domains
const SPAM_TLDS = new Set([
  "xyz", "top", "win", "loan", "gq", "ml", "tk", "ga", "cf",
  "click", "link", "download", "review", "stream",
]);

function senderDomain(addr: string): string {
  return addr.split("@")[1]?.toLowerCase() ?? "";
}

function isTrusted(addr: string): boolean {
  const domain = senderDomain(addr);
  for (const t of TRUSTED_DOMAINS) {
    if (domain === t || domain.endsWith(`.${t}`)) return true;
  }
  return false;
}

// ── Weighted signal tables ───────────────────────────────────────────────────
// Important signals are intentionally heavy (7–12) so a single clear signal
// clears IMPORTANT_THRESHOLD (6) on its own, even when SPAM signals are also
// present in the email footer.

const PHISHING_SIGNALS: [string, number][] = [
  ["your account has been permanently suspended", 8],
  ["your account will be permanently deleted", 8],
  ["confirm your account ownership to avoid", 8],
  ["reactivate your account by clicking", 7],
  ["click here to restore access to your account", 7],
  ["we have limited your account access", 6],
  ["verify your paypal account", 8],
  ["verify your bank account", 8],
  ["your bank account has been", 6],
  ["dear valued customer, your account", 5],
  ["your account has been flagged for suspicious", 6],
  ["update your billing information immediately", 6],
  ["your card has been charged without authorization", 7],
  ["claim your prize by clicking", 7],
  ["you have been randomly selected", 5],
];

const SUSPICIOUS_SIGNALS: [string, number][] = [
  ["we detected a login from an unrecognized device", 5],
  ["someone attempted to access your account", 5],
  ["your account has been accessed from an unknown device", 5],
  ["your password was changed without your permission", 6],
  ["unauthorized changes were made to your account", 6],
  ["your account may have been compromised", 4],
  ["suspicious activity detected on your account", 5],
];

const IMPORTANT_SIGNALS: [string, number][] = [
  // Authentication codes — highest priority
  ["one-time code",       12],
  ["one time code",       12],
  ["verification code",   12],
  [" otp:",               12],
  ["\notp\n",             12],
  ["two-factor",          10],
  ["2fa code",            12],
  ["authenticator code",  12],
  ["enter this code",     10],
  ["your code is",        10],
  ["sign-in code",        10],
  // Job / career
  ["interview invitation",  12],
  ["interview scheduled",   12],
  ["interview confirmation",12],
  ["job offer",             12],
  ["offer letter",          12],
  ["salary offer",          10],
  ["we'd like to offer you", 10],
  ["you have been selected for an interview", 12],
  // Financial — transactional (weight ≥ 7 so a single match clears threshold)
  ["invoice",             7],
  ["receipt",             7],
  ["order confirmed",     7],
  ["order placed",        7],
  ["order shipped",       7],
  ["order delivered",     7],
  ["shipment tracking",   7],
  ["payment received",    7],
  ["payment processed",   7],
  ["subscription charged",7],
  ["subscription renewal",7],
  ["bank statement",      7],
  ["account statement",   7],
  ["wire transfer",       8],
  ["direct deposit",      7],
  // Financial — urgent
  ["overdue invoice",     9],
  ["past due notice",     9],
  ["payment overdue",     9],
  ["final notice",        8],
  ["bank alert",          8],
  ["payment alert",       8],
  ["fraud alert",         8],
  // Legal / official
  ["contract",            4],
  ["legal notice",        8],
  ["signed agreement",    7],
  ["tax return",          7],
  ["tax form",            7],
  ["tax notice",          7],
  ["irs notice",          9],
  // Appointments / bookings
  ["appointment confirmed", 7],
  ["booking confirmed",     7],
  ["reservation confirmed", 7],
  ["your appointment",      4],
  // Medical
  ["test results",        7],
  ["prescription",        5],
  ["medical record",      7],
  // Auth / account
  ["password reset",      6],
  ["reset your password", 6],
];

const TASKS_SIGNALS: [string, number][] = [
  ["rsvp",                    6],
  ["please rsvp",             6],
  ["respond by",              6],
  ["due by",                  6],
  ["due date",                5],
  ["deadline",                6],
  ["by end of day",           6],
  ["by eod",                  6],
  ["by tomorrow",             5],
  ["please complete",         6],
  ["please fill out",         6],
  ["please sign",             6],
  ["please submit",           6],
  ["please respond",          5],
  ["please review and",       5],
  ["please confirm your attendance", 6],
  ["action required",         5],
  ["action needed",           5],
  ["your response is needed", 6],
  ["awaiting your response",  5],
  ["your signature is required", 7],
  ["e-sign",                  6],
  ["docusign",                7],
  ["hellosign",               7],
  ["you've been invited",     4],
  ["you're invited",          4],
  ["share your feedback",     4],
  ["complete our survey",     5],
  ["take our survey",         5],
  ["meeting request",         5],
  ["calendar invite",         5],
  ["join us for",             4],
  ["form to complete",        5],
  ["fill in the form",        5],
  ["follow up",               4],
  ["following up",            4],
];

const SPAM_SIGNALS: [string, number][] = [
  // Unsubscribe is reliable but reduced — it appears in legitimate transactional emails
  ["unsubscribe",                      3],
  ["opt out",                          2],
  ["opt-out",                          2],
  ["to stop receiving",                3],
  ["this email was sent to you because", 3],
  ["you are receiving this",           2],
  ["manage your email preferences",    2],
  // Marketing language
  ["limited time offer",               4],
  ["limited time only",                4],
  ["exclusive offer",                  3],
  ["special offer",                    3],
  ["special deal",                     3],
  ["don't miss out",                   3],
  ["act now",                          4],
  ["shop now",                         2],
  ["buy now",                          2],
  ["click here to save",               3],
  ["click here to get",                3],
  ["click here to claim",              4],
  ["save up to",                       3],
  ["% off",                            3],
  ["sale ends",                        3],
  ["flash sale",                       4],
  ["black friday",                     3],
  ["cyber monday",                     3],
  ["free shipping",                    3],
  ["free trial",                       3],
  ["no credit card required",          4],
  ["risk-free",                        3],
  ["money-back guarantee",             3],
  // Prize / lottery
  ["you've been selected",             5],
  ["you have been selected",           5],
  ["congratulations, you",             4],
  ["you're a winner",                  5],
  ["you won",                          4],
  ["claim your prize",                 5],
  ["claim your reward",                4],
  ["promo code",                       3],
  ["coupon code",                      3],
  ["discount code",                    3],
  // MLM / work from home
  ["earn money",                       4],
  ["make money",                       4],
  ["work from home",                   4],
  ["passive income",                   4],
  ["financial freedom",                3],
  // Newsletter / digest patterns
  ["weekly digest",                    4],
  ["daily digest",                     4],
  ["monthly newsletter",               4],
  ["check out our latest",             3],
  ["new arrivals",                     3],
  ["back in stock",                    3],
];

const SPAM_SENDER_PREFIXES = [
  "marketing@", "promo@", "promotions@", "newsletter@",
  "deals@", "offers@", "bulk@", "noreply@newsletter.",
  "info@newsletter.", "sales@",
];

// ── Subject-line patterns ────────────────────────────────────────────────────
// Applied to subject only (short, high-signal text).

const SUBJECT_IMPORTANT_PATTERNS: [RegExp, number][] = [
  [/\b(invoice|receipt|order)\s*#?\s*\d+/i,    8],  // "Invoice #1234"
  [/\bINV[-–]\d+/,                              8],  // "INV-1234"
  [/\b(otp|code)\s*[:–-]\s*\d{4,8}\b/i,       12],  // "OTP: 123456"
  [/\b\d{4,8}\s+is your.{0,20}code\b/i,        12],  // "123456 is your code"
  [/re\s*:/i,                                    3],  // RE: (reply chain)
  [/fwd?\s*:/i,                                  2],  // FWD: (forwarded)
  [/\byour (invoice|receipt|order|statement)\b/i, 7],
  [/\b(appointment|booking|reservation)\s+(confirmed|reminder)\b/i, 7],
];

const SUBJECT_SPAM_PATTERNS: [RegExp, number][] = [
  [/[A-Z]{5,}/,                            2],   // 5+ consecutive caps
  [/[!]{2,}/,                              2],   // multiple exclamation marks
  [/\d+\s*%\s*off/i,                       3],   // "50% OFF"
  [/\$[\d,]+.*off/i,                       3],   // "$20 off"
  [/\bfree\b.{0,20}\b(trial|gift|prize|shipping|access)\b/i, 3],
];

const SUBJECT_TASKS_PATTERNS: [RegExp, number][] = [
  [/\b(due|deadline|submit|rsvp|respond)\b.{0,30}\b(by|before|on)\b/i, 5],
  [/action required/i,                     5],
  [/follow[\s-]up/i,                       4],
  [/reminder:/i,                           4],
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function scoreKeywords(text: string, signals: [string, number][]): number {
  const lower = text.toLowerCase();
  let total = 0;
  for (const [kw, pts] of signals) {
    if (lower.includes(kw)) total += pts;
  }
  return total;
}

function scorePatterns(text: string, patterns: [RegExp, number][]): number {
  return patterns.reduce((sum, [re, pts]) => sum + (re.test(text) ? pts : 0), 0);
}

function preferredCategory(name: string, categories: { name: string }[]): string {
  const match = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (match) return match.name;
  const benign = categories.find((c) => c.name.toLowerCase() === "benign");
  return benign?.name ?? categories[0]?.name ?? name;
}

// ── Main export ──────────────────────────────────────────────────────────────
export function manualTriage(
  email: TriageInput,
  categories: { name: string }[],
): TriageResult {
  const subject    = email.subject ?? "";
  const senderAddr = email.fromAddress.toLowerCase();
  const domain     = senderDomain(email.fromAddress);
  const tld        = domain.split(".").pop() ?? "";
  const trusted    = isTrusted(email.fromAddress);
  const body       = [email.fromName ?? "", email.snippet, email.bodyPreview].join(" ");
  const full       = [subject, body].join(" ");

  const s: Scores = { phishing: 0, suspicious: 0, important: 0, tasks: 0, spam: 0 };

  // ── Sender signals ────────────────────────────────────────────────────────
  if (SPAM_SENDER_PREFIXES.some((p) => senderAddr.includes(p))) s.spam  += 5;
  if (SPAM_TLDS.has(tld))                                        s.spam  += 3;
  if (!trusted && (domain.match(/-/g) ?? []).length >= 3)        s.suspicious += 1;

  // ── Subject signals ───────────────────────────────────────────────────────
  s.important += scorePatterns(subject, SUBJECT_IMPORTANT_PATTERNS);
  s.spam      += scorePatterns(subject, SUBJECT_SPAM_PATTERNS);
  s.tasks     += scorePatterns(subject, SUBJECT_TASKS_PATTERNS);

  // ── Content signals ───────────────────────────────────────────────────────
  if (!trusted) {
    s.phishing   += scoreKeywords(full, PHISHING_SIGNALS);
    s.suspicious += scoreKeywords(full, SUSPICIOUS_SIGNALS);
  }
  s.important += scoreKeywords(full, IMPORTANT_SIGNALS);
  s.tasks     += scoreKeywords(full, TASKS_SIGNALS);
  s.spam      += scoreKeywords(full, SPAM_SIGNALS);

  // ── Decision (Important is checked before SPAM intentionally) ─────────────

  if (!trusted && s.phishing >= PHISHING_THRESHOLD) {
    return { categoryName: preferredCategory("Phishing",   categories), importanceScore: 5 };
  }
  if (!trusted && s.suspicious >= SUSPICIOUS_THRESHOLD && s.suspicious > s.important) {
    return { categoryName: preferredCategory("Suspicious", categories), importanceScore: 4 };
  }

  // Important — clear signal overrides any amount of SPAM in the same email.
  // Core transactional signals (invoice, receipt, OTP, job offer, etc.) are
  // all weighted ≥ 7, so a single match clears IMPORTANT_THRESHOLD (6).
  if (s.important >= IMPORTANT_THRESHOLD) {
    const importanceScore =
      s.important >= 18 ? 5 :
      s.important >= 12 ? 4 :
      s.important >= 8  ? 4 : 3;
    return { categoryName: preferredCategory("Important", categories), importanceScore };
  }

  // Tasks
  if (s.tasks >= TASKS_THRESHOLD) {
    const urgent = /urgent|asap|today|eod|immediately/i.test(full);
    return {
      categoryName: preferredCategory("Tasks", categories),
      importanceScore: urgent ? 4 : 3,
    };
  }

  // SPAM
  if (s.spam >= SPAM_THRESHOLD) {
    return { categoryName: preferredCategory("SPAM", categories), importanceScore: 1 };
  }

  // Weak Important or Tasks signals that didn't clear their thresholds
  if (s.important > 0 && s.important >= s.tasks) {
    return { categoryName: preferredCategory("Important", categories), importanceScore: 2 };
  }
  if (s.tasks > 0) {
    return { categoryName: preferredCategory("Tasks", categories), importanceScore: 2 };
  }

  // Benign
  return { categoryName: preferredCategory("Benign", categories), importanceScore: 2 };
}
