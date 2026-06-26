import Link from "next/link";
import { signOut } from "@/auth";

export function Header({ email }: { email?: string | null }) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div>
          <Link href="/dashboard" className="text-lg font-semibold text-zinc-900">
            Email Visibility
          </Link>
          {email && <p className="text-sm text-zinc-500">{email}</p>}
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="text-zinc-600 hover:text-zinc-900">
            Inbox
          </Link>
          <Link href="/settings" className="text-zinc-600 hover:text-zinc-900">
            Categories
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-zinc-600 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
            >
              Sign out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
