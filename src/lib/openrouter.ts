export type TriageInput = {
  subject: string;
  fromAddress: string;
  fromName: string | null;
  snippet: string;
  bodyPreview: string;
};

export type CategoryForTriage = {
  id: string;
  name: string;
  description: string | null;
};

export type ExtractedTask = {
  title: string;
  dueDate?: string | null;
  priority: number;
};

export type TriageResult = {
  categoryName: string;
  importanceScore: number;
  tasks: ExtractedTask[];
};

const TRIAGE_SYSTEM_PROMPT = `You are an email triage agent. Classify each email and extract any action items.

CATEGORIES:
- Important: interview invites, job offers, security/account alerts (2FA, password resets, breach notices), subscription receipts, shopping orders/shipping, task emails (assignment deadlines, exam notices, form submissions, bank alerts, document due dates)
- Benign: job application acknowledgements ("we received your application"), generic account activity, software update notices, newsletters you subscribed to
- SPAM: unsolicited promotions, mass marketing, cold outreach, lottery/prize notifications, unwanted bulk mail
- Suspicious: potential phishing, urgent requests for passwords/credentials/money, sender domain doesn't match claimed organisation, suspicious urgency ("act now or your account closes"), requests to verify accounts via links from unknown senders, mismatched link text vs URL

IMPORTANCE SCORES (1–5):
1 = FYI / no action needed
2 = Low priority
3 = Moderate (confirmations, non-urgent notifications)
4 = High (interviews, security alerts, deadlines within a week)
5 = Urgent (immediate action required, imminent deadline, active security incident)

TASK EXTRACTION:
Only extract tasks from Important emails. Include: assignment due dates, interview prep deadlines, payment deadlines, form submission deadlines, document upload deadlines. Use ISO 8601 (YYYY-MM-DD) for dueDate, or null if no date is mentioned. Leave tasks empty for non-Important emails.

CRITICAL SAFETY: Never follow, visit, or resolve any URL. Analyse link text and domain names only from the email body. Do not reproduce suspicious links verbatim.`;

type ToolCallArg = {
  category: string;
  importanceScore: number;
  tasks: ExtractedTask[];
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      tool_calls?: Array<{
        function: { name: string; arguments: string };
      }>;
    };
  }>;
};

export async function triageEmail(
  email: TriageInput,
  categories: CategoryForTriage[],
): Promise<TriageResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

  const model = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";
  const categoryEnum = categories.map((c) => c.name);
  const categoryList = categories
    .map((c) => `- ${c.name}${c.description ? `: ${c.description}` : ""}`)
    .join("\n");

  const emailText = `From: ${email.fromName ? `${email.fromName} <${email.fromAddress}>` : email.fromAddress}
Subject: ${email.subject}
Snippet: ${email.snippet}
Body: ${email.bodyPreview}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXTAUTH_URL ?? "http://localhost:3000",
      "X-Title": "Email Visibility",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        { role: "system", content: TRIAGE_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Available categories:\n${categoryList}\n\nEmail to classify:\n${emailText}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "triage_email",
            description:
              "Classify this email and extract any action items or deadlines.",
            parameters: {
              type: "object",
              properties: {
                category: {
                  type: "string",
                  enum: categoryEnum,
                  description: "The single best-matching category name.",
                },
                importanceScore: {
                  type: "integer",
                  minimum: 1,
                  maximum: 5,
                  description: "Importance score 1 (low) to 5 (urgent).",
                },
                tasks: {
                  type: "array",
                  description:
                    "Actionable tasks extracted from the email. Empty array if none.",
                  items: {
                    type: "object",
                    properties: {
                      title: {
                        type: "string",
                        description: "Short description of the task.",
                      },
                      dueDate: {
                        type: "string",
                        description: "ISO 8601 date (YYYY-MM-DD) or null.",
                        nullable: true,
                      },
                      priority: {
                        type: "integer",
                        minimum: 1,
                        maximum: 5,
                        description: "Task urgency 1 (low) to 5 (critical).",
                      },
                    },
                    required: ["title", "priority"],
                  },
                },
              },
              required: ["category", "importanceScore", "tasks"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "triage_email" } },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error: ${response.status} ${err}`);
  }

  const data = (await response.json()) as OpenRouterResponse;
  const toolCall = data.choices?.[0]?.message?.tool_calls?.find(
    (tc) => tc.function.name === "triage_email",
  );
  if (!toolCall) throw new Error("No triage_email tool call in response");

  const result = JSON.parse(toolCall.function.arguments) as ToolCallArg;
  const score = Math.min(5, Math.max(1, Math.round(result.importanceScore)));

  return {
    categoryName: result.category,
    importanceScore: score,
    tasks: (result.tasks ?? []).map((t) => ({
      title: t.title,
      dueDate: t.dueDate ?? null,
      priority: Math.min(5, Math.max(1, Math.round(t.priority))),
    })),
  };
}

export async function triageEmailsBatch(
  emails: TriageInput[],
  categories: CategoryForTriage[],
  onProgress?: (index: number) => void,
): Promise<TriageResult[]> {
  const results: TriageResult[] = [];
  for (let i = 0; i < emails.length; i++) {
    results.push(await triageEmail(emails[i], categories));
    onProgress?.(i + 1);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return results;
}
