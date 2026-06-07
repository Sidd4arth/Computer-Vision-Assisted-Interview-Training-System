"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950">
      {/* Nav */}
      <nav className="border-b border-neutral-900 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/"
            className="font-mono text-sm tracking-tight text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            ← MockPrep
          </Link>
        </div>
      </nav>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-10">
            <p className="font-mono text-xs text-neutral-600 uppercase tracking-widest mb-3">
              Authentication
            </p>
            <h1 className="font-serif text-4xl text-white mb-2">
              Welcome back.
            </h1>
            <p className="text-neutral-500 text-sm">
              Sign in to access your sessions and analytics.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-3 border border-red-900/50 bg-red-950/30 rounded text-red-400 text-xs font-mono">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block font-mono text-xs text-neutral-500 uppercase tracking-widest mb-2"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block font-mono text-xs text-neutral-500 uppercase tracking-widest mb-2"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-white text-black font-mono text-sm py-3 rounded hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign in →"}
            </button>
          </form>

          <p className="mt-8 text-center font-mono text-xs text-neutral-600">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-neutral-400 hover:text-white transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
