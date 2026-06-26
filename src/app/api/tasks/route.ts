import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id },
    include: {
      email: {
        select: {
          id: true,
          subject: true,
          fromAddress: true,
          fromName: true,
          gmailId: true,
        },
      },
    },
    orderBy: [
      { completed: "asc" },
      { dueDate: "asc" },
      { priority: "desc" },
    ],
  });

  return NextResponse.json({ tasks });
}
