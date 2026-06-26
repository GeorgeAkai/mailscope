import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    categoryId?: string;
    importanceScore?: number;
  };

  const email = await prisma.email.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  if (body.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: body.categoryId, userId: session.user.id },
    });
    if (!category) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
  }

  const updated = await prisma.email.update({
    where: { id },
    data: {
      ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
      ...(body.importanceScore !== undefined
        ? { importanceScore: Math.min(5, Math.max(1, body.importanceScore)) }
        : {}),
      userOverride: true,
    },
    include: { category: true },
  });

  return NextResponse.json(updated);
}
