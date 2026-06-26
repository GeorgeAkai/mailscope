import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/Header";
import { EmailList } from "@/components/EmailList";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboarded: true, syncDays: true },
  });

  if (!user?.onboarded) {
    redirect("/onboard");
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header email={session.user.email} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900">Priority inbox</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Showing inbox emails from the last {user.syncDays} days, sorted by category
            priority and importance. Syncs automatically every 15 minutes.
          </p>
        </div>
        <EmailList />
      </main>
    </div>
  );
}
