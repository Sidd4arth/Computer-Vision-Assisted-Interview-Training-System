"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function AuthNav() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="w-24 h-8 bg-neutral-900 rounded animate-pulse" />
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-4">
        <span className="font-mono text-xs text-neutral-500 hidden sm:block">
          {session.user.email}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="font-mono text-xs border border-neutral-800 hover:border-neutral-600 text-neutral-400 hover:text-neutral-200 px-4 py-2 rounded transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/login"
        className="font-mono text-xs text-neutral-500 hover:text-neutral-200 transition-colors"
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className="font-mono text-xs border border-neutral-700 hover:border-neutral-500 px-4 py-2 rounded transition-colors"
      >
        Sign up
      </Link>
    </div>
  );
}
