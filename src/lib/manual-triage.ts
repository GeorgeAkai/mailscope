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

// Each group is checked in priority order (most severe first).
// Using simple substring match for reliability and zero dependencies.
const PHISHING_KEYWORDS = [
  "verify your account", "verify your email address", "confirm your identity",
  "confirm your password", "confirm account ownership",
  "your account has been suspended", "your account has been locked",
  "your account has been disabled", "your account will be closed",
  "click here to verify", "click here to confirm",
  "unusual sign-in activity", "suspicious login attempt",
  "we detected unauthorized", "credentials have been compromised",
  "your account has been compromised",
];

const SUSPICIOUS_KEYWORDS = [
  "security alert", "security warning", "security notice",
  "unauthorized access attempt", "your account is at risk",
  "we have noticed unusual activity", "we detected unusual activity",
  "action required immediately", "immediate action required",
  "unusual activity on your account",
];

// High-urgency important signals (score 5)
const IMPORTANT_URGENT_KEYWORDS = [
  "one-time code", "one time code", "verification code", " otp ",
  "two-factor", "2fa code", "interview invitation",
  "job offer", "bank alert", "payment alert",
  "overdue invoice", "past due notice", "account suspended",
];

// Standard important signals (score 4)
const IMPORTANT_KEYWORDS = [
  "invoice", "receipt", "order confirmed", "order placed",
  "order shipped", "order delivered", "bank statement",
  "account statement", "tax return", "tax form", "tax notice",
  "appointment confirmed", "booking confirmed", "reservation confirmed",
  "offer letter", "subscription charged", "payment received",
  "payment processed", "contract", "legal notice",
];

// Action-required signals
const TASKS_KEYWORDS = [
  "rsvp", "respond by", "due by", "due date:", "deadline",
  "please complete", "please fill out", "please sign",
  "please submit", "please review and", "please respond",
  "action required", "your response is needed",
  "awaiting your response", "your signature is required",
  "form needs to be completed",
];

// Promotional / bulk / marketing signals (score 1)
const SPAM_KEYWORDS = [
  "unsubscribe", "opt out", "opt-out",
  "limited time offer", "exclusive offer", "special offer",
  "special deal", "earn money", "make money", "work from home",
  "you've been selected", "you have been selected",
  "congratulations, you", "you're a winner", "you won a",
  "promo code", "coupon code", "discount code",
  "free trial", "buy now", "shop now", "click here to save",
  "click here to get", "click here to claim",
  "this email was sent to you because", "to stop receiving",
];

// Sender prefixes strongly associated with automated bulk mail
const SPAM_SENDER_PREFIXES = [
  "noreply@newsletter.", "marketing@", "promo@",
  "promotions@", "deals@", "offers@", "bulk@",
];

function hit(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function preferredCategory(name: string, categories: { name: string }[]): string {
  const match = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (match) return match.name;
  const benign = categories.find((c) => c.name.toLowerCase() === "benign");
  return benign?.name ?? categories[0]?.name ?? name;
}

export function manualTriage(
  email: TriageInput,
  categories: { name: string }[],
): TriageResult {
  const full = [
    email.subject,
    email.fromName ?? "",
    email.snippet,
    email.bodyPreview,
  ].join(" ");

  const senderLower = email.fromAddress.toLowerCase();

  // 1. Phishing
  if (hit(full, PHISHING_KEYWORDS)) {
    return { categoryName: preferredCategory("Phishing", categories), importanceScore: 5 };
  }

  // 2. Suspicious
  if (hit(full, SUSPICIOUS_KEYWORDS)) {
    return { categoryName: preferredCategory("Suspicious", categories), importanceScore: 4 };
  }

  // 3. Important — check urgent signals first
  if (hit(full, IMPORTANT_URGENT_KEYWORDS)) {
    return { categoryName: preferredCategory("Important", categories), importanceScore: 5 };
  }

  if (hit(full, IMPORTANT_KEYWORDS)) {
    return { categoryName: preferredCategory("Important", categories), importanceScore: 4 };
  }

  // 4. Tasks
  if (hit(full, TASKS_KEYWORDS)) {
    const urgentTask =
      full.toLowerCase().includes("urgent") ||
      full.toLowerCase().includes("asap") ||
      full.toLowerCase().includes("today");
    return {
      categoryName: preferredCategory("Tasks", categories),
      importanceScore: urgentTask ? 4 : 3,
    };
  }

  // 5. SPAM — keyword match or known bulk-sender prefix
  const isSpamSender = SPAM_SENDER_PREFIXES.some((p) => senderLower.includes(p));
  if (hit(full, SPAM_KEYWORDS) || isSpamSender) {
    return { categoryName: preferredCategory("SPAM", categories), importanceScore: 1 };
  }

  // 6. Default: Benign
  return { categoryName: preferredCategory("Benign", categories), importanceScore: 2 };
}
