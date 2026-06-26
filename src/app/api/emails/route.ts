import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const categoryFilter = searchParams.get("categoryId");

  const categories = await prisma.category.findMany({
    where: { userId: session.user.id },
    orderBy: { priority: "asc" },
  });

  const emails = await prisma.email.findMany({
    where: {
      userId: session.user.id,
      ...(categoryFilter ? { categoryId: categoryFilter } : {}),
    },
    include: { category: true },
  });

  const categoryPriority = new Map(categories.map((c) => [c.id, c.priority]));

  emails.sort((a, b) => {
    const aPriority = a.categoryId ? (categoryPriority.get(a.categoryId) ?? 999) : 999;
    const bPriority = b.categoryId ? (categoryPriority.get(b.categoryId) ?? 999) : 999;
    if (aPriority !== bPriority) return aPriority - bPriority;
    if (b.importanceScore !== a.importanceScore) return b.importanceScore - a.importanceScore;
    return b.receivedAt.getTime() - a.receivedAt.getTime();
  });

  return NextResponse.json({ emails, categories });
}
