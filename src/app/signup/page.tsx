"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    // Register the user
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Registration failed. Please try again.");
      return;
    }

    // Auto-login after registration
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Account created but login failed. Please try logging in.");
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
              Create Account
            </p>
            <h1 className="font-serif text-4xl text-white mb-2">
              Join MockPrep.
            </h1>
            <p className="text-neutral-500 text-sm">
              Track your progress and get personalised feedback across sessions.
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
                htmlFor="signup-name"
                className="block font-mono text-xs text-neutral-500 uppercase tracking-widest mb-2"
              >
                Name <span className="text-neutral-700">(optional)</span>
              </label>
              <input
                id="signup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sidd"
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="signup-email"
                className="block font-mono text-xs text-neutral-500 uppercase tracking-widest mb-2"
              >
                Email
              </label>
              <input
                id="signup-email"
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
                htmlFor="signup-password"
                className="block font-mono text-xs text-neutral-500 uppercase tracking-widest mb-2"
              >
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Min. 8 characters"
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="signup-confirm"
                className="block font-mono text-xs text-neutral-500 uppercase tracking-widest mb-2"
              >
                Confirm Password
              </label>
              <input
                id="signup-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>

            <button
              id="signup-submit"
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-white text-black font-mono text-sm py-3 rounded hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Create account →"}
            </button>
          </form>

          <p className="mt-8 text-center font-mono text-xs text-neutral-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-neutral-400 hover:text-white transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
