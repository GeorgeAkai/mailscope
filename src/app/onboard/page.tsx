import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/Header";
import { OnboardForm } from "@/components/OnboardForm";

export default async function OnboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboarded: true },
  });

  if (user?.onboarded) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header email={session.user.email} />
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-12">
        <OnboardForm />
      </main>
    </div>
  );
}
