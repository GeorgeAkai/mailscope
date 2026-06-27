import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_SYNC_DAYS = [7, 30, 90];
const VALID_INTERVALS = [0, 1, 4, 12, 24];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { syncDays: true, syncIntervalHours: true, lastSyncedAt: true },
  });

  return NextResponse.json(user);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    syncDays?: number;
    syncIntervalHours?: number;
  };

  const data: { syncDays?: number; syncIntervalHours?: number } = {};

  if (body.syncDays !== undefined) {
    if (!VALID_SYNC_DAYS.includes(body.syncDays)) {
      return NextResponse.json({ error: "Invalid syncDays" }, { status: 400 });
    }
    data.syncDays = body.syncDays;
  }

  if (body.syncIntervalHours !== undefined) {
    if (!VALID_INTERVALS.includes(body.syncIntervalHours)) {
      return NextResponse.json({ error: "Invalid syncIntervalHours" }, { status: 400 });
    }
    data.syncIntervalHours = body.syncIntervalHours;
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { syncDays: true, syncIntervalHours: true, lastSyncedAt: true },
  });

  return NextResponse.json(user);
}
