import { prisma } from "@/lib/prisma";
import { fetchInboxMessages, GmailMessage } from "@/lib/gmail";
import { triageEmail } from "@/lib/openrouter";
import type { Category } from "@/generated/prisma/client";

function resolveCategoryId(
  categoryName: string,
  categories: Category[],
): string | null {
  const normalized = categoryName.trim().toLowerCase();
  const match = categories.find((c) => c.name.toLowerCase() === normalized);
  if (match) return match.id;

  // Fall back to Benign as the catch-all safe category
  const benign = categories.find((c) => c.name.toLowerCase() === "benign");
  return benign?.id ?? categories[0]?.id ?? null;
}

async function persistTasks(
  userId: string,
  emailId: string,
  tasks: Array<{ title: string; dueDate?: string | null; priority: number }>,
) {
  // Remove incomplete tasks from previous triage; keep completed ones
  await prisma.task.deleteMany({
    where: { emailId, completed: false },
  });

  if (tasks.length === 0) return;

  await prisma.task.createMany({
    data: tasks.map((t) => ({
      userId,
      emailId,
      title: t.title,
      dueDate: t.dueDate ? new Date(t.dueDate) : null,
      priority: t.priority,
    })),
  });
}

async function upsertAndTriageMessage(
  userId: string,
  message: GmailMessage,
  categories: Category[],
  forceRetriage: boolean,
) {
  const existing = await prisma.email.findUnique({
    where: { userId_gmailId: { userId, gmailId: message.gmailId } },
  });

  // User manually overrode — only update metadata, never retriage
  if (existing?.userOverride) {
    return prisma.email.update({
      where: { id: existing.id },
      data: {
        threadId: message.threadId,
        subject: message.subject,
        fromAddress: message.fromAddress,
        fromName: message.fromName,
        snippet: message.snippet,
        bodyPreview: message.bodyPreview,
        receivedAt: message.receivedAt,
      },
    });
  }

  // Already classified and no forced retriage — only update metadata
  if (existing && !forceRetriage) {
    return prisma.email.update({
      where: { id: existing.id },
      data: {
        threadId: message.threadId,
        subject: message.subject,
        fromAddress: message.fromAddress,
        fromName: message.fromName,
        snippet: message.snippet,
        bodyPreview: message.bodyPreview,
        receivedAt: message.receivedAt,
      },
    });
  }

  const triage = await triageEmail(
    {
      subject: message.subject,
      fromAddress: message.fromAddress,
      fromName: message.fromName,
      snippet: message.snippet,
      bodyPreview: message.bodyPreview,
    },
    categories,
  );

  const categoryId = resolveCategoryId(triage.categoryName, categories);
  const importanceScore = triage.importanceScore;

  const email = await prisma.email.upsert({
    where: { userId_gmailId: { userId, gmailId: message.gmailId } },
    create: {
      userId,
      gmailId: message.gmailId,
      threadId: message.threadId,
      subject: message.subject,
      fromAddress: message.fromAddress,
      fromName: message.fromName,
      snippet: message.snippet,
      bodyPreview: message.bodyPreview,
      receivedAt: message.receivedAt,
      categoryId,
      importanceScore,
      triagedAt: new Date(),
    },
    update: {
      threadId: message.threadId,
      subject: message.subject,
      fromAddress: message.fromAddress,
      fromName: message.fromName,
      snippet: message.snippet,
      bodyPreview: message.bodyPreview,
      receivedAt: message.receivedAt,
      categoryId,
      importanceScore,
      triagedAt: new Date(),
    },
  });

  await persistTasks(userId, email.id, triage.tasks);

  return email;
}

export async function syncUserEmails(
  userId: string,
  options?: { retriage?: boolean },
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { categories: { orderBy: { priority: "asc" } } },
  });

  if (!user?.onboarded) throw new Error("User has not completed onboarding");
  if (user.categories.length === 0) throw new Error("No categories configured");

  const messages = await fetchInboxMessages(userId, user.syncDays);
  let processed = 0;

  for (const message of messages) {
    await upsertAndTriageMessage(
      userId,
      message,
      user.categories,
      options?.retriage ?? false,
    );
    processed++;
  }

  return { processed, total: messages.length };
}

export async function retriageUserEmails(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { categories: { orderBy: { priority: "asc" } } },
  });

  if (!user) throw new Error("User not found");

  const emails = await prisma.email.findMany({
    where: { userId, userOverride: false },
  });

  let retriaged = 0;

  for (const email of emails) {
    const triage = await triageEmail(
      {
        subject: email.subject ?? "",
        fromAddress: email.fromAddress,
        fromName: email.fromName,
        snippet: email.snippet ?? "",
        bodyPreview: email.bodyPreview ?? "",
      },
      user.categories,
    );

    await prisma.email.update({
      where: { id: email.id },
      data: {
        categoryId: resolveCategoryId(triage.categoryName, user.categories),
        importanceScore: triage.importanceScore,
        triagedAt: new Date(),
      },
    });

    await persistTasks(userId, email.id, triage.tasks);

    retriaged++;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return { retriaged };
}

export async function syncAllUsers() {
  const users = await prisma.user.findMany({
    where: { onboarded: true },
    select: { id: true, email: true },
  });

  const results: Array<{
    userId: string;
    email: string | null;
    processed: number;
    error?: string;
  }> = [];

  for (const user of users) {
    try {
      const { processed } = await syncUserEmails(user.id);
      results.push({ userId: user.id, email: user.email, processed });
    } catch (error) {
      results.push({
        userId: user.id,
        email: user.email,
        processed: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}
