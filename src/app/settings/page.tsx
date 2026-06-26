import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/Header";
import { CategoryManager } from "@/components/CategoryManager";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboarded: true },
  });

  if (!user?.onboarded) {
    redirect("/onboard");
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header email={session.user.email} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <CategoryManager />
      </main>
    </div>
  );
}
