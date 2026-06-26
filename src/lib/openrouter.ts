import { chatCompletion, getAIConfig, type ChatTool } from "@/lib/ai-client";

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

const TRIAGE_SYSTEM_PROMPT = `You are an email triage agent. Classify each email and extract action items.

CATEGORIES:
- Important: interview invites, job offers, security/account alerts (2FA, password resets), subscription receipts, shopping orders, bank alerts
- Tasks: emails with clear action items — assignment deadlines, meeting requests, document submissions, form completions, RSVPs, follow-ups
- Benign: job application acknowledgements, generic account activity, software update notices, newsletters
- SPAM: unsolicited promotions, mass marketing, cold outreach, lottery/prize notifications, unwanted bulk mail
- Suspicious: unusual sender, unexpected account warnings, requests to verify credentials from unfamiliar senders, manufactured urgency
- Phishing: impersonating banks/services/brands, fake login pages, credential harvesting, spoofed addresses, fake security alerts demanding immediate action on suspicious links

IMPORTANCE SCORES (1–5):
1 = FYI / no action needed
2 = Low priority
3 = Moderate
4 = High (interviews, security alerts, deadlines within a week)
5 = Urgent (immediate action, imminent deadline, active security incident)

TASK EXTRACTION:
Extract tasks from Important or Tasks emails only. Include assignment due dates, interview dates, payment deadlines, form submission deadlines, etc. Use ISO 8601 (YYYY-MM-DD) for dueDate or null. Empty array for other categories.

CRITICAL SAFETY: Never follow, visit, or resolve any URL. Analyse link text and sender domain only. Do not reproduce suspicious URLs verbatim.`;

const TRIAGE_TOOL: ChatTool = {
  type: "function",
  function: {
    name: "triage_email",
    description: "Classify this email and extract any action items or deadlines.",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
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
          description: "Action items extracted from the email. Empty array if none.",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Short task description." },
              dueDate: { type: "string", description: "ISO 8601 date or null.", nullable: true },
              priority: { type: "integer", minimum: 1, maximum: 5 },
            },
            required: ["title", "priority"],
          },
        },
      },
      required: ["category", "importanceScore", "tasks"],
    },
  },
};

type ToolCallArg = {
  category: string;
  importanceScore: number;
  tasks: ExtractedTask[];
};

export async function triageEmail(
  email: TriageInput,
  categories: CategoryForTriage[],
  userId?: string,
): Promise<TriageResult> {
  const config = userId
    ? await getAIConfig(userId)
    : {
        provider: "openrouter" as const,
        apiKey: process.env.OPENROUTER_API_KEY ?? "",
        model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
      };

  if (!config.apiKey) throw new Error("No AI API key configured");

  const categoryEnum = categories.map((c) => c.name).join(", ");
  const categoryList = categories
    .map((c) => `- ${c.name}${c.description ? `: ${c.description}` : ""}`)
    .join("\n");

  // Inject current category enum into the tool schema
  const tool: ChatTool = {
    ...TRIAGE_TOOL,
    function: {
      ...TRIAGE_TOOL.function,
      parameters: {
        ...TRIAGE_TOOL.function.parameters,
        properties: {
          ...(TRIAGE_TOOL.function.parameters.properties as Record<string, unknown>),
          category: {
            type: "string",
            enum: categories.map((c) => c.name),
            description: `One of: ${categoryEnum}`,
          },
        },
      },
    },
  };

  const emailText = `From: ${email.fromName ? `${email.fromName} <${email.fromAddress}>` : email.fromAddress}
Subject: ${email.subject}
Snippet: ${email.snippet}
Body: ${email.bodyPreview}`;

  const result = await chatCompletion(
    config,
    [
      { role: "system", content: TRIAGE_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Available categories:\n${categoryList}\n\nEmail to classify:\n${emailText}`,
      },
    ],
    [tool],
    0.1,
    "triage_email",
  );

  const toolCall = result.tool_calls?.find((tc) => tc.function.name === "triage_email");
  if (!toolCall) throw new Error("No triage_email tool call in response");

  const parsed = JSON.parse(toolCall.function.arguments) as ToolCallArg;
  const score = Math.min(5, Math.max(1, Math.round(parsed.importanceScore)));

  return {
    categoryName: parsed.category,
    importanceScore: score,
    tasks: (parsed.tasks ?? []).map((t) => ({
      title: t.title,
      dueDate: t.dueDate ?? null,
      priority: Math.min(5, Math.max(1, Math.round(t.priority))),
    })),
  };
}

export async function triageEmailsBatch(
  emails: TriageInput[],
  categories: CategoryForTriage[],
  userId?: string,
  onProgress?: (index: number) => void,
): Promise<TriageResult[]> {
  const results: TriageResult[] = [];
  for (let i = 0; i < emails.length; i++) {
    results.push(await triageEmail(emails[i], categories, userId));
    onProgress?.(i + 1);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return results;
}
