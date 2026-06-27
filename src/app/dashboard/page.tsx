import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/Header";
import { EmailList } from "@/components/EmailList";
import { ChatBot } from "@/components/ChatBot";
import { GettingStartedGuide } from "@/components/GettingStartedGuide";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboarded: true, syncDays: true, llmApiKey: true },
  });

  if (!user?.onboarded) {
    redirect("/onboard");
  }

  const hasUserKey = !!user.llmApiKey;

  return (
    <div className="bg-grid flex flex-1 flex-col">
      <Header email={session.user.email} activePath="dashboard" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Priority inbox
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Last{" "}
            <span className="font-medium text-blue-400">{user.syncDays} days</span>{" "}
            of Gmail · sorted by category & importance · auto-syncs every 15 min
          </p>
        </div>
        <GettingStartedGuide hasUserKey={hasUserKey} />
        <EmailList hasUserKey={hasUserKey} />
      </main>
      <ChatBot />
    </div>
  );
}
