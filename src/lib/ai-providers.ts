export type AIProvider = "openrouter" | "openai" | "anthropic" | "google";

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  openrouter: "openai/gpt-4o-mini",
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-4-5-20251001",
  google: "gemini-2.0-flash",
};

export const PROVIDER_NAMES: Record<AIProvider, string> = {
  openrouter: "OpenRouter",
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google Gemini",
};
