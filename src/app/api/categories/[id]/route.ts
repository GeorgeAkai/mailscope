import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { retriageUserEmails } from "@/lib/sync";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const category = await prisma.category.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const other = await prisma.category.findFirst({
    where: { userId: session.user.id, name: "Other", NOT: { id } },
  });

  await prisma.email.updateMany({
    where: { categoryId: id, userId: session.user.id },
    data: { categoryId: other?.id ?? null, userOverride: false },
  });

  await prisma.category.delete({ where: { id } });

  retriageUserEmails(session.user.id).catch(console.error);

  return NextResponse.json({ ok: true });
}
