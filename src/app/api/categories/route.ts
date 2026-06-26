import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { retriageUserEmails } from "@/lib/sync";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    where: { userId: session.user.id },
    orderBy: { priority: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    description?: string;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const maxPriority = await prisma.category.aggregate({
    where: { userId: session.user.id },
    _max: { priority: true },
  });

  const category = await prisma.category.create({
    data: {
      userId: session.user.id,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      priority: (maxPriority._max.priority ?? -1) + 1,
    },
  });

  retriageUserEmails(session.user.id).catch(console.error);

  return NextResponse.json(category, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    categories?: Array<{ id: string; name?: string; description?: string; priority?: number }>;
  };

  if (!body.categories?.length) {
    return NextResponse.json({ error: "Categories required" }, { status: 400 });
  }

  for (const cat of body.categories) {
    await prisma.category.updateMany({
      where: { id: cat.id, userId: session.user.id },
      data: {
        ...(cat.name !== undefined ? { name: cat.name.trim() } : {}),
        ...(cat.description !== undefined
          ? { description: cat.description.trim() || null }
          : {}),
        ...(cat.priority !== undefined ? { priority: cat.priority } : {}),
      },
    });
  }

  retriageUserEmails(session.user.id).catch(console.error);

  const categories = await prisma.category.findMany({
    where: { userId: session.user.id },
    orderBy: { priority: "asc" },
  });

  return NextResponse.json(categories);
}
