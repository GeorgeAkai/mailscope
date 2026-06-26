import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInButton } from "@/components/SignInButton";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="text-lg font-semibold">Email Visibility</span>
          <Link href="/login" className="text-sm text-zinc-600 hover:text-zinc-900">
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-1 flex-col justify-center px-4 py-16">
        <div className="space-y-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Important emails first.
            <span className="block text-indigo-600">Junk stays out of the way.</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-zinc-600">
            Connect Gmail, let AI triage your inbox into categories, and see what matters
            sorted by priority and importance — without changing anything in Gmail.
          </p>
          <div className="flex justify-center pt-4">
            <SignInButton />
          </div>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          <Feature
            title="Smart triage"
            description="OpenRouter-powered classification into Job, Spam, and custom categories."
          />
          <Feature
            title="Priority inbox"
            description="Sorted by category priority, then AI importance score — so you never miss key emails."
          />
          <Feature
            title="Read-only"
            description="Your Gmail stays untouched. Triage lives in this app only."
          />
        </div>
      </main>
    </div>
  );
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 text-left">
      <h3 className="font-semibold text-zinc-900">{title}</h3>
      <p className="mt-2 text-sm text-zinc-600">{description}</p>
    </div>
  );
}
