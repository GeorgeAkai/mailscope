"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type EmailRef = {
  id: string;
  subject: string | null;
  fromAddress: string;
  fromName: string | null;
};

type Task = {
  id: string;
  title: string;
  dueDate: Date | null;
  priority: number;
  completed: boolean;
  email: EmailRef;
};

const PRIORITY_COLORS: Record<number, string> = {
  5: "text-red-400",
  4: "text-orange-400",
  3: "text-yellow-400",
  2: "text-slate-400",
  1: "text-slate-500",
};

function formatDue(date: Date | null): { label: string; overdue: boolean } {
  if (!date) return { label: "No due date", overdue: false };
  const d = new Date(date);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const overdue = diffDays < 0;

  if (diffDays === 0) return { label: "Due today", overdue: false };
  if (diffDays === 1) return { label: "Due tomorrow", overdue: false };
  if (diffDays < 0)
    return {
      label: `${Math.abs(diffDays)}d overdue`,
      overdue: true,
    };
  if (diffDays <= 7) return { label: `Due in ${diffDays}d`, overdue: false };

  return {
    label: `Due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    overdue,
  };
}

export function TaskList({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [toggling, setToggling] = useState<string | null>(null);

  async function toggleTask(id: string) {
    if (toggling) return;
    setToggling(id);
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "PATCH" });
      if (res.ok) {
        const { task } = (await res.json()) as { task: Task };
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: task.completed } : t)));
      }
    } finally {
      setToggling(null);
    }
  }

  const pending = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);

  const overdue = pending.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date(),
  );
  const upcoming = pending.filter(
    (t) => t.dueDate && new Date(t.dueDate) >= new Date(),
  );
  const noDue = pending.filter((t) => !t.dueDate);

  if (tasks.length === 0) {
    return (
      <div className="glass rounded-xl p-10 text-center">
        <p className="text-2xl">✅</p>
        <p className="mt-3 font-medium text-slate-300">No tasks yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Tasks are extracted automatically when your emails sync.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {overdue.length > 0 && (
        <Section title="Overdue" titleClass="text-red-400">
          {overdue.map((t) => (
            <TaskCard key={t.id} task={t} onToggle={toggleTask} toggling={toggling === t.id} />
          ))}
        </Section>
      )}
      {upcoming.length > 0 && (
        <Section title="Upcoming">
          {upcoming.map((t) => (
            <TaskCard key={t.id} task={t} onToggle={toggleTask} toggling={toggling === t.id} />
          ))}
        </Section>
      )}
      {noDue.length > 0 && (
        <Section title="No deadline">
          {noDue.map((t) => (
            <TaskCard key={t.id} task={t} onToggle={toggleTask} toggling={toggling === t.id} />
          ))}
        </Section>
      )}
      {done.length > 0 && (
        <Section title="Completed" titleClass="text-slate-500">
          {done.map((t) => (
            <TaskCard key={t.id} task={t} onToggle={toggleTask} toggling={toggling === t.id} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  titleClass,
  children,
}: {
  title: string;
  titleClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className={cn("mb-3 text-xs font-semibold uppercase tracking-wider", titleClass ?? "text-slate-400")}>
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function TaskCard({
  task,
  onToggle,
  toggling,
}: {
  task: Task;
  onToggle: (id: string) => void;
  toggling: boolean;
}) {
  const { label, overdue } = formatDue(task.dueDate);
  const sender = task.email.fromName ?? task.email.fromAddress;

  return (
    <div
      className={cn(
        "glass flex items-start gap-3 rounded-lg px-4 py-3 transition",
        task.completed && "opacity-50",
      )}
    >
      <button
        onClick={() => onToggle(task.id)}
        disabled={toggling}
        className={cn(
          "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition",
          task.completed
            ? "border-blue-500 bg-blue-500"
            : "border-slate-600 hover:border-blue-400",
        )}
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
      >
        {task.completed && (
          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium leading-snug", task.completed ? "line-through text-slate-500" : "text-slate-100")}>
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-xs font-medium",
              task.completed ? "text-slate-600" : overdue ? "text-red-400" : "text-slate-400",
            )}
          >
            {label}
          </span>
          <span className="text-xs text-slate-600">·</span>
          <span className="truncate text-xs text-slate-500">
            {task.email.subject ?? sender}
          </span>
          <span
            className={cn(
              "ml-auto text-xs font-medium",
              PRIORITY_COLORS[task.priority] ?? "text-slate-400",
            )}
          >
            P{task.priority}
          </span>
        </div>
      </div>
    </div>
  );
}
