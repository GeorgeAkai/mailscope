import { NextResponse } from "next/server";
import { syncAllUsers } from "@/lib/sync";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await syncAllUsers();
  return NextResponse.json({ results, syncedAt: new Date().toISOString() });
}
