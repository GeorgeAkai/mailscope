import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CATEGORIES, SYNC_DAY_OPTIONS } from "@/lib/defaults";
import { syncUserEmails } from "@/lib/sync";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { syncDays?: number };
  const syncDays = body.syncDays ?? 30;

  if (!SYNC_DAY_OPTIONS.includes(syncDays as (typeof SYNC_DAY_OPTIONS)[number])) {
    return NextResponse.json({ error: "Invalid syncDays" }, { status: 400 });
  }

  const userId = session.user.id;

  await prisma.user.update({
    where: { id: userId },
    data: { syncDays, onboarded: true },
  });

  const existingCategories = await prisma.category.count({ where: { userId } });
  if (existingCategories === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((cat) => ({
        userId,
        name: cat.name,
        description: cat.description,
        priority: cat.priority,
        isDefault: true,
      })),
    });
  }

  syncUserEmails(userId).catch((error) => {
    console.error("Initial sync failed:", error);
  });

  return NextResponse.json({ ok: true, syncDays });
}
