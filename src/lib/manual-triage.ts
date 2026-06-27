// Rule-based email classifier used when no AI key is configured.
// Uses a multi-signal scoring engine: each signal adds weighted points to a
// category bucket. Highest bucket wins, with Phishing/Suspicious overriding
// others when the evidence crosses a threshold (untrusted senders only).

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

// ── Trusted sender bypass ────────────────────────────────────────────────────
// Emails from these domains never get flagged as Phishing or Suspicious —
// their security notices, 2FA codes, and sign-in alerts are legitimate.
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

// TLDs almost exclusively used by spam/throwaway domains
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
// [keyword, points]  — all matching is case-insensitive substring

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
  ["your [bank] account", 4],
  ["claim your prize by clicking", 7],
  ["you have been randomly selected", 5],
  ["update your billing information immediately", 6],
  ["your card has been charged without authorization", 7],
];

const SUSPICIOUS_SIGNALS: [string, number][] = [
  ["we detected a login from an unrecognized device", 5],
  ["someone attempted to access your account", 5],
  ["your account has been accessed from an unknown device", 5],
  ["your password was changed without your permission", 6],
  ["unauthorized changes were made to your account", 6],
  ["your account may have been compromised", 4],
  ["unusual sign-in blocked", 3],
  ["suspicious activity detected on your account", 4],
];

const IMPORTANT_SIGNALS: [string, number][] = [
  // Auth / security codes (score 5 importance)
  ["one-time code", 6],
  ["one time code", 6],
  ["verification code", 6],
  [" otp:", 6],
  ["two-factor", 5],
  ["2fa code", 6],
  ["authenticator code", 6],
  ["enter this code", 5],
  ["your code is", 5],
  // Job / career
  ["interview invitation", 7],
  ["interview scheduled", 7],
  ["interview confirmation", 7],
  ["job offer", 7],
  ["offer letter", 7],
  ["salary offer", 6],
  ["we'd like to offer you", 6],
  ["you have been selected for an interview", 7],
  // Financial — urgent
  ["overdue invoice", 6],
  ["past due notice", 6],
  ["payment overdue", 6],
  ["final notice", 5],
  ["bank alert", 5],
  ["payment alert", 5],
  ["fraud alert", 5],
  // Financial — standard
  ["invoice", 4],
  ["receipt", 4],
  ["order confirmed", 4],
  ["order placed", 4],
  ["order shipped", 4],
  ["order delivered", 4],
  ["shipment tracking", 4],
  ["payment received", 4],
  ["payment processed", 4],
  ["subscription charged", 4],
  ["subscription renewal", 4],
  ["bank statement", 4],
  ["account statement", 4],
  ["wire transfer", 5],
  ["direct deposit", 4],
  // Legal / official
  ["contract", 3],
  ["legal notice", 5],
  ["signed agreement", 4],
  ["tax return", 4],
  ["tax form", 4],
  ["tax notice", 4],
  ["irs notice", 6],
  // Appointments / bookings
  ["appointment confirmed", 4],
  ["booking confirmed", 4],
  ["reservation confirmed", 4],
  ["your appointment", 3],
  // Medical
  ["test results", 4],
  ["prescription", 3],
  ["medical record", 4],
  // Account & security from trusted services (reply chain)
  ["password reset", 4],
  ["reset your password", 4],
  ["welcome to", 2],
];

const TASKS_SIGNALS: [string, number][] = [
  ["rsvp", 5],
  ["please rsvp", 5],
  ["respond by", 5],
  ["due by", 5],
  ["due date", 4],
  ["deadline", 5],
  ["by end of day", 5],
  ["by eod", 5],
  ["by tomorrow", 4],
  ["by friday", 4],
  ["by monday", 4],
  ["please complete", 5],
  ["please fill out", 5],
  ["please sign", 5],
  ["please submit", 5],
  ["please respond", 4],
  ["please review and", 4],
  ["please confirm your attendance", 5],
  ["action required", 4],
  ["action needed", 4],
  ["your response is needed", 5],
  ["awaiting your response", 4],
  ["your signature is required", 6],
  ["e-sign", 5],
  ["docusign", 5],
  ["hellosign", 5],
  ["you've been invited", 3],
  ["you're invited", 3],
  ["share your feedback", 3],
  ["complete our survey", 4],
  ["take our survey", 4],
  ["short survey", 3],
  ["meeting request", 4],
  ["calendar invite", 4],
  ["join us for", 3],
  ["form to complete", 4],
  ["fill in the form", 4],
];

const SPAM_SIGNALS: [string, number][] = [
  // Unsubscribe is the most reliable single spam indicator
  ["unsubscribe", 5],
  ["opt out", 3],
  ["opt-out", 3],
  ["to stop receiving", 4],
  ["this email was sent to you because", 4],
  ["you are receiving this", 3],
  ["manage your email preferences", 3],
  ["update your preferences", 2],
  // Marketing language
  ["limited time offer", 4],
  ["limited time only", 4],
  ["exclusive offer", 3],
  ["special offer", 3],
  ["special deal", 3],
  ["don't miss out", 3],
  ["act now", 4],
  ["shop now", 3],
  ["buy now", 3],
  ["order now", 2],
  ["click here to save", 3],
  ["click here to get", 3],
  ["click here to claim", 4],
  ["save up to", 3],
  ["% off", 3],
  ["sale ends", 3],
  ["flash sale", 4],
  ["black friday", 3],
  ["cyber monday", 3],
  ["free shipping", 3],
  ["free trial", 3],
  ["no credit card required", 4],
  ["risk-free", 3],
  ["money-back guarantee", 3],
  // Prize / lottery
  ["you've been selected", 5],
  ["you have been selected", 5],
  ["congratulations, you", 4],
  ["you're a winner", 5],
  ["you won", 4],
  ["claim your prize", 5],
  ["claim your reward", 4],
  ["promo code", 3],
  ["coupon code", 3],
  ["discount code", 3],
  // MLM / work from home
  ["earn money", 4],
  ["make money", 4],
  ["work from home", 4],
  ["passive income", 4],
  ["financial freedom", 3],
  // Newsletter / digest patterns
  ["weekly digest", 4],
  ["daily digest", 4],
  ["monthly newsletter", 4],
  ["top stories", 2],
  ["check out our latest", 3],
  ["new arrivals", 3],
  ["back in stock", 3],
  ["discover new", 2],
];

// ── Sender-level signals ─────────────────────────────────────────────────────
const SPAM_SENDER_PREFIXES = [
  "marketing@", "promo@", "promotions@", "newsletter@",
  "deals@", "offers@", "bulk@", "noreply@newsletter.",
  "info@newsletter.", "sales@",
];

// ── Subject-level signals ────────────────────────────────────────────────────
// Patterns applied specifically to the subject line (often very high-signal)
const SUBJECT_IMPORTANT_PATTERNS = [
  /\b(invoice|receipt|order)\s*#?\s*\d+/i,      // "Invoice #1234"
  /\bINV[-–]\d+/,                                // "INV-1234"
  /\b(otp|code)\s*[:–-]\s*\d{4,8}\b/i,         // "OTP: 123456"
  /\b\d{4,8}\s+is your.{0,15}code\b/i,          // "123456 is your verification code"
  /re\s*:/i,                                     // RE: (reply chain = real conversation)
  /fwd?\s*:/i,                                   // FWD: (forwarded real email)
];

const SUBJECT_SPAM_PATTERNS = [
  /[A-Z]{5,}/,           // 5+ consecutive caps (SALE, HURRY, FREE)
  /[!]{2,}/,             // multiple exclamation marks
  /\d+\s*%\s*off/i,      // "50% OFF"
  /\$\d+.*off/i,         // "$20 off"
  /\bfree\b.{0,20}\b(trial|gift|prize|shipping|access)\b/i,
];

const SUBJECT_TASKS_PATTERNS = [
  /\b(due|deadline|submit|rsvp|respond)\b.{0,30}\b(by|before|on)\b/i,
  /action required/i,
  /follow[\s-]up/i,
  /reminder:/i,
];

// ── Scoring helpers ──────────────────────────────────────────────────────────
function scoreKeywords(text: string, signals: [string, number][]): number {
  const lower = text.toLowerCase();
  let total = 0;
  for (const [kw, pts] of signals) {
    if (lower.includes(kw)) total += pts;
  }
  return total;
}

function scorePatterns(text: string, patterns: RegExp[]): number {
  return patterns.reduce((sum, re) => sum + (re.test(text) ? 1 : 0), 0);
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
  const subject = email.subject ?? "";
  const senderAddr = email.fromAddress.toLowerCase();
  const domain = senderDomain(email.fromAddress);
  const tld = domain.split(".").pop() ?? "";
  const trusted = isTrusted(email.fromAddress);

  // Full searchable text (subject + sender + body)
  const body = [email.fromName ?? "", email.snippet, email.bodyPreview].join(" ");
  const full = [subject, body].join(" ");

  const s: Scores = { phishing: 0, suspicious: 0, important: 0, tasks: 0, spam: 0 };

  // ── Sender signals ────────────────────────────────────────────────────────
  if (SPAM_SENDER_PREFIXES.some((p) => senderAddr.includes(p))) s.spam += 5;
  if (SPAM_TLDS.has(tld)) s.spam += 3;
  // Domain with excessive hyphens or digits is mildly suspicious
  if (!trusted && (domain.match(/-/g) ?? []).length >= 3) s.suspicious += 1;

  // ── Subject-line signals ──────────────────────────────────────────────────
  s.important += scorePatterns(subject, SUBJECT_IMPORTANT_PATTERNS) * 3;
  s.spam     += scorePatterns(subject, SUBJECT_SPAM_PATTERNS) * 2;
  s.tasks    += scorePatterns(subject, SUBJECT_TASKS_PATTERNS) * 3;

  // ── Content signals ───────────────────────────────────────────────────────
  if (!trusted) {
    s.phishing   += scoreKeywords(full, PHISHING_SIGNALS);
    s.suspicious += scoreKeywords(full, SUSPICIOUS_SIGNALS);
  }
  s.important += scoreKeywords(full, IMPORTANT_SIGNALS);
  s.tasks     += scoreKeywords(full, TASKS_SIGNALS);
  s.spam      += scoreKeywords(full, SPAM_SIGNALS);

  // ── Decision ──────────────────────────────────────────────────────────────

  // Security threats override everything if evidence is strong enough
  if (!trusted && s.phishing >= 5) {
    return { categoryName: preferredCategory("Phishing", categories), importanceScore: 5 };
  }
  if (!trusted && s.suspicious >= 4 && s.suspicious > s.important) {
    return { categoryName: preferredCategory("Suspicious", categories), importanceScore: 4 };
  }

  // Among positive categories pick the highest scorer
  const ranked = [
    { cat: "Important", score: s.important },
    { cat: "Tasks",     score: s.tasks },
    { cat: "SPAM",      score: s.spam },
  ].sort((a, b) => b.score - a.score);

  const winner = ranked[0];
  if (winner.score > 0) {
    let importanceScore: number;
    if (winner.cat === "Important") {
      // Scale 1-5 from score: ≥10→5, ≥7→4, ≥4→3, else 2
      importanceScore = winner.score >= 10 ? 5 : winner.score >= 7 ? 4 : winner.score >= 4 ? 3 : 2;
    } else if (winner.cat === "Tasks") {
      const hasUrgency = /urgent|asap|today|eod|immediately/i.test(full);
      importanceScore = hasUrgency ? 4 : 3;
    } else {
      importanceScore = 1; // SPAM
    }
    return { categoryName: preferredCategory(winner.cat, categories), importanceScore };
  }

  // Default: Benign
  return { categoryName: preferredCategory("Benign", categories), importanceScore: 2 };
}
