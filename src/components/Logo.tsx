import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({
  href = "/",
  size = "md",
  showText = true,
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}) {
  const iconSize = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-10 w-10" : "h-8 w-8";
  const textSize = size === "sm" ? "text-base" : size === "lg" ? "text-xl" : "text-lg";

  return (
    <Link href={href} className="group flex items-center gap-2.5">
      <div
        className={cn(
          iconSize,
          "relative flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30 transition group-hover:shadow-blue-500/50",
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-[55%] w-[55%] text-white"
          aria-hidden="true"
        >
          <path
            d="M3 8l9 6 9-6M3 8v8a2 2 0 002 2h14a2 2 0 002-2V8M3 8l9-4 9 4"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 14v4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="opacity-80"
          />
        </svg>
        <div className="absolute inset-0 rounded-lg bg-blue-400/20 opacity-0 blur-md transition group-hover:opacity-100" />
      </div>
      {showText && (
        <span className={cn(textSize, "font-semibold tracking-tight text-slate-100")}>
          Email<span className="text-blue-400">Visibility</span>
        </span>
      )}
    </Link>
  );
}
