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

export type TriageResult = {
  categoryName: string;
  importanceScore: number;
};

export async function triageEmail(
  email: TriageInput,
  categories: CategoryForTriage[],
): Promise<TriageResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const model = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";
  const categoryList = categories
    .map((c) => `- ${c.name}${c.description ? `: ${c.description}` : ""}`)
    .join("\n");

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
      messages: [
        {
          role: "system",
          content: `You classify emails into exactly one of the user's categories and assign an importance score from 1 (low) to 5 (urgent/important). Respond with JSON only: {"categoryName": string, "importanceScore": number}. Pick the single best category.`,
        },
        {
          role: "user",
          content: `Categories:\n${categoryList}\n\nEmail:\nFrom: ${email.fromName ? `${email.fromName} <${email.fromAddress}>` : email.fromAddress}\nSubject: ${email.subject}\nSnippet: ${email.snippet}\nBody: ${email.bodyPreview}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter error: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenRouter");
  }

  const parsed = JSON.parse(content) as TriageResult;
  const score = Math.min(5, Math.max(1, Math.round(parsed.importanceScore)));

  return {
    categoryName: parsed.categoryName,
    importanceScore: score,
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
