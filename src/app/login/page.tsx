import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInButton } from "@/components/SignInButton";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Sign in</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Use your Google account to sign in and grant read-only Gmail access.
          </p>
        </div>
        <SignInButton />
      </div>
    </div>
  );
}
