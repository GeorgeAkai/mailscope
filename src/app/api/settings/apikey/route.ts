import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_MODELS, type AIProvider } from "@/lib/ai-providers";

export const dynamic = "force-dynamic";

const VALID_PROVIDERS: AIProvider[] = ["openrouter", "openai", "anthropic", "google"];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { llmProvider: true, llmApiKey: true, llmModel: true },
  });

  return NextResponse.json({
    provider: user?.llmProvider ?? null,
    hasKey: !!user?.llmApiKey,
    keyPreview: user?.llmApiKey ? `${user.llmApiKey.slice(0, 6)}…` : null,
    model: user?.llmModel ?? null,
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    provider?: string;
    apiKey?: string;
    model?: string;
    clear?: boolean;
  };

  if (body.clear) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { llmProvider: null, llmApiKey: null, llmModel: null },
    });
    return NextResponse.json({ ok: true });
  }

  if (!body.provider || !VALID_PROVIDERS.includes(body.provider as AIProvider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }
  if (!body.apiKey?.trim()) {
    return NextResponse.json({ error: "API key is required" }, { status: 400 });
  }

  const provider = body.provider as AIProvider;
  const model = body.model?.trim() || DEFAULT_MODELS[provider];

  await prisma.user.update({
    where: { id: session.user.id },
    data: { llmProvider: provider, llmApiKey: body.apiKey.trim(), llmModel: model },
  });

  return NextResponse.json({ ok: true });
}
