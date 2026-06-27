import { prisma } from "@/lib/prisma";
export type { AIProvider } from "@/lib/ai-providers";
export { DEFAULT_MODELS, PROVIDER_NAMES } from "@/lib/ai-providers";
import type { AIProvider } from "@/lib/ai-providers";
import { DEFAULT_MODELS, PROVIDER_NAMES } from "@/lib/ai-providers";

function friendlyError(provider: AIProvider, status: number, body: string): Error {
  const name = PROVIDER_NAMES[provider] ?? provider;
  // Try to extract a message from the JSON body
  let detail: string | undefined;
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string; code?: number };
      message?: string;
    };
    detail = parsed.error?.message ?? parsed.message;
  } catch { /* body wasn't JSON */ }

  switch (status) {
    case 401:
      return new Error(`Invalid API key for ${name}. Go to Settings → AI Engine to update it.`);
    case 402:
      return new Error(
        `Your ${name} account is out of credits. Add credits at your provider dashboard, then try again.`,
      );
    case 403:
      return new Error(`Access denied by ${name}. Check that your API key has the right permissions.`);
    case 429:
      return new Error(`${name} rate limit hit. Wait a moment, then sync again.`);
    case 503:
    case 529:
      return new Error(`${name} is temporarily overloaded. Try again in a few minutes.`);
    default:
      return new Error(
        detail
          ? `${name} error: ${detail}`
          : `${name} returned an unexpected error (HTTP ${status}). Try again later.`,
      );
  }
}

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ChatTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatCompletionResult {
  content: string | null;
  tool_calls?: ToolCall[];
}

export async function getAIConfig(userId: string): Promise<AIConfig> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { llmProvider: true, llmApiKey: true, llmModel: true },
  });

  if (user?.llmApiKey && user.llmProvider) {
    const provider = user.llmProvider as AIProvider;
    return {
      provider,
      apiKey: user.llmApiKey,
      model: user.llmModel ?? DEFAULT_MODELS[provider],
    };
  }

  throw new Error("No AI key configured. Go to Settings → AI Engine to add your API key.");
}

/* ── OpenAI-compatible (OpenRouter + OpenAI) ── */
async function callOpenAICompat(
  config: AIConfig,
  messages: ChatMessage[],
  tools: ChatTool[] | undefined,
  temperature: number,
  toolChoice?: unknown,
): Promise<ChatCompletionResult> {
  const baseUrl =
    config.provider === "openai"
      ? "https://api.openai.com/v1"
      : "https://openrouter.ai/api/v1";

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };
  if (config.provider === "openrouter") {
    headers["HTTP-Referer"] = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    headers["X-Title"] = "MailScope";
  }

  const body: Record<string, unknown> = { model: config.model, temperature, messages };
  if (tools?.length) body.tools = tools;
  if (toolChoice) body.tool_choice = toolChoice;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) throw friendlyError(config.provider, res.status, await res.text());

  const data = (await res.json()) as {
    choices?: Array<{
      message?: { content?: string | null; tool_calls?: ToolCall[] };
    }>;
  };
  const msg = data.choices?.[0]?.message;
  return { content: msg?.content ?? null, tool_calls: msg?.tool_calls };
}

/* ── Anthropic ── */
function toAnthropicMessages(messages: ChatMessage[]): {
  system: string | undefined;
  msgs: unknown[];
} {
  let system: string | undefined;
  const msgs: unknown[] = [];

  for (const msg of messages) {
    if (msg.role === "system") { system = msg.content ?? undefined; continue; }

    if (msg.role === "user") {
      msgs.push({ role: "user", content: msg.content ?? "" });
    } else if (msg.role === "assistant") {
      if (msg.tool_calls?.length) {
        const content: unknown[] = [];
        if (msg.content) content.push({ type: "text", text: msg.content });
        for (const tc of msg.tool_calls) {
          content.push({
            type: "tool_use",
            id: tc.id,
            name: tc.function.name,
            input: JSON.parse(tc.function.arguments) as unknown,
          });
        }
        msgs.push({ role: "assistant", content });
      } else {
        msgs.push({ role: "assistant", content: msg.content ?? "" });
      }
    } else if (msg.role === "tool") {
      // Group consecutive tool results into a single user message
      const last = msgs[msgs.length - 1] as { role: string; content: unknown[] } | undefined;
      const toolResult = {
        type: "tool_result",
        tool_use_id: msg.tool_call_id,
        content: msg.content ?? "",
      };
      if (last?.role === "user" && Array.isArray(last.content) &&
          (last.content as { type?: string }[])[0]?.type === "tool_result") {
        last.content.push(toolResult);
      } else {
        msgs.push({ role: "user", content: [toolResult] });
      }
    }
  }
  return { system, msgs };
}

async function callAnthropic(
  config: AIConfig,
  messages: ChatMessage[],
  tools: ChatTool[] | undefined,
  temperature: number,
  forceTool?: string,
): Promise<ChatCompletionResult> {
  const { system, msgs } = toAnthropicMessages(messages);

  const anthropicTools = tools?.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));

  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: 1024,
    temperature,
    messages: msgs,
  };
  if (system) body.system = system;
  if (anthropicTools?.length) body.tools = anthropicTools;
  if (forceTool) body.tool_choice = { type: "tool", name: forceTool };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw friendlyError("anthropic", res.status, await res.text());

  const data = (await res.json()) as {
    content?: Array<
      | { type: "text"; text: string }
      | { type: "tool_use"; id: string; name: string; input: unknown }
    >;
  };

  const textPart = data.content?.find((c) => c.type === "text") as
    | { type: "text"; text: string }
    | undefined;
  const toolUses = (data.content?.filter((c) => c.type === "tool_use") ?? []) as Array<{
    type: "tool_use"; id: string; name: string; input: unknown;
  }>;

  return {
    content: textPart?.text ?? null,
    tool_calls: toolUses.length
      ? toolUses.map((tu) => ({
          id: tu.id,
          type: "function" as const,
          function: { name: tu.name, arguments: JSON.stringify(tu.input) },
        }))
      : undefined,
  };
}

/* ── Google Gemini ── */
function toGeminiMessages(messages: ChatMessage[]): {
  systemInstruction: string | undefined;
  contents: unknown[];
} {
  let systemInstruction: string | undefined;
  const contents: unknown[] = [];

  for (const msg of messages) {
    if (msg.role === "system") { systemInstruction = msg.content ?? undefined; continue; }

    if (msg.role === "user") {
      contents.push({ role: "user", parts: [{ text: msg.content ?? "" }] });
    } else if (msg.role === "assistant") {
      if (msg.tool_calls?.length) {
        contents.push({
          role: "model",
          parts: msg.tool_calls.map((tc) => ({
            functionCall: {
              name: tc.function.name,
              args: JSON.parse(tc.function.arguments) as unknown,
            },
          })),
        });
      } else {
        contents.push({ role: "model", parts: [{ text: msg.content ?? "" }] });
      }
    } else if (msg.role === "tool") {
      // Group consecutive tool responses into a single user message
      const last = contents[contents.length - 1] as {
        role: string;
        parts: unknown[];
      } | undefined;
      const part = {
        functionResponse: {
          name: msg.name ?? "",
          response: { content: msg.content ?? "" },
        },
      };
      if (last?.role === "user" && Array.isArray(last.parts) &&
          (last.parts as { functionResponse?: unknown }[])[0]?.functionResponse) {
        last.parts.push(part);
      } else {
        contents.push({ role: "user", parts: [part] });
      }
    }
  }
  return { systemInstruction, contents };
}

async function callGoogle(
  config: AIConfig,
  messages: ChatMessage[],
  tools: ChatTool[] | undefined,
  temperature: number,
): Promise<ChatCompletionResult> {
  const { systemInstruction, contents } = toGeminiMessages(messages);

  const geminiTools = tools?.length
    ? [{ functionDeclarations: tools.map((t) => ({ name: t.function.name, description: t.function.description, parameters: t.function.parameters })) }]
    : undefined;

  const body: Record<string, unknown> = {
    contents,
    generationConfig: { temperature },
  };
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };
  if (geminiTools) body.tools = geminiTools;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw friendlyError("google", res.status, await res.text());

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<
          | { text: string }
          | { functionCall: { name: string; args: Record<string, unknown> } }
        >;
      };
    }>;
  };

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const textPart = parts.find((p) => "text" in p) as { text: string } | undefined;
  const funcParts = parts.filter((p) => "functionCall" in p) as Array<{
    functionCall: { name: string; args: Record<string, unknown> };
  }>;

  return {
    content: textPart?.text ?? null,
    tool_calls: funcParts.length
      ? funcParts.map((p, i) => ({
          id: `call_${Date.now()}_${i}`,
          type: "function" as const,
          function: { name: p.functionCall.name, arguments: JSON.stringify(p.functionCall.args) },
        }))
      : undefined,
  };
}

/* ── Main dispatcher ── */
export async function chatCompletion(
  config: AIConfig,
  messages: ChatMessage[],
  tools?: ChatTool[],
  temperature = 0.3,
  forceTool?: string,
): Promise<ChatCompletionResult> {
  switch (config.provider) {
    case "openrouter":
    case "openai":
      return callOpenAICompat(
        config,
        messages,
        tools,
        temperature,
        forceTool ? { type: "function", function: { name: forceTool } } : undefined,
      );
    case "anthropic":
      return callAnthropic(config, messages, tools, temperature, forceTool);
    case "google":
      return callGoogle(config, messages, tools, temperature);
  }
}
