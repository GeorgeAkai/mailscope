import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/Header";
import { TaskList } from "@/components/TaskList";
import { ChatBot } from "@/components/ChatBot";

export default async function TasksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboarded: true },
  });
  if (!user?.onboarded) redirect("/onboard");

  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id },
    include: {
      email: {
        select: {
          id: true,
          subject: true,
          fromAddress: true,
          fromName: true,
        },
      },
    },
    orderBy: [
      { completed: "asc" },
      { dueDate: "asc" },
      { priority: "desc" },
    ],
  });

  return (
    <div className="bg-grid flex flex-1 flex-col">
      <Header email={session.user.email} activePath="tasks" />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">
            Tasks
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Deadlines and action items extracted from your Important emails
          </p>
        </div>
        <TaskList initialTasks={tasks} />
      </main>
      <ChatBot />
    </div>
  );
}
