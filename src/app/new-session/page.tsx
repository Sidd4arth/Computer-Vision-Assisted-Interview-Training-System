"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const durations = [
  { value: 30, label: "30 min", desc: "3 questions" },
  { value: 45, label: "45 min", desc: "4 questions" },
  { value: 60, label: "60 min", desc: "4 questions" },
  { value: 90, label: "90 min", desc: "5 questions" },
];

export default function NewSessionPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("");
  const [duration, setDuration] = useState(45);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [companies, setCompanies] = useState<string[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchCompanies() {
      try {
        const res = await fetch("/api/companies");
        const data = await res.json();
        setCompanies(data.companies || []);
      } catch { /* ignore */ }
    }
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (companyName.trim().length === 0) {
      setFilteredCompanies(companies.slice(0, 12));
    } else {
      const search = companyName.toLowerCase();
      setFilteredCompanies(
        companies.filter((c) => c.toLowerCase().includes(search)).slice(0, 8)
      );
    }
  }, [companyName, companies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!companyName || !role) {
      setError("Please fill in all fields.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, role, lpa: "15", duration }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create session");
      }
      const data = await res.json();
      router.push(`/interview/${data.uid}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const selectCompany = (c: string) => {
    setCompanyName(c);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  return (
    <div className="min-h-screen">
      <nav className="border-b border-neutral-900 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="font-mono text-sm text-neutral-400 hover:text-neutral-200 transition-colors">
            ← Back
          </Link>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-16">
        <p className="font-mono text-xs text-neutral-600 uppercase tracking-widest mb-3">
          New Session
        </p>
        <h1 className="font-serif text-3xl text-white mb-10">
          Configure your interview
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Company */}
          <div className="relative">
            <label className="block font-mono text-xs text-neutral-500 uppercase tracking-wider mb-2">
              Company
            </label>
            <input
              ref={inputRef}
              type="text"
              value={companyName}
              onChange={(e) => { setCompanyName(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full bg-transparent border-b border-neutral-800 focus:border-neutral-500 pb-3 text-lg text-white placeholder-neutral-700 focus:outline-none transition-colors"
              placeholder="Google, Amazon, Microsoft..."
              autoComplete="off"
            />

            {showSuggestions && filteredCompanies.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-neutral-900 border border-neutral-800 rounded-lg max-h-56 overflow-y-auto">
                {filteredCompanies.map((company) => (
                  <button
                    key={company}
                    type="button"
                    onClick={() => selectCompany(company)}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-800 transition-colors font-mono ${
                      company.toLowerCase() === companyName.toLowerCase()
                        ? "text-white"
                        : "text-neutral-400"
                    }`}
                  >
                    {company}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 mt-4">
              {["Google", "Amazon", "Microsoft", "Meta", "Apple", "Adobe", "Goldman Sachs", "Uber"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => selectCompany(c)}
                  className={`font-mono text-[11px] px-2.5 py-1 rounded transition-colors ${
                    companyName === c
                      ? "bg-white text-black"
                      : "bg-neutral-900 text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block font-mono text-xs text-neutral-500 uppercase tracking-wider mb-2">
              Role
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-transparent border-b border-neutral-800 focus:border-neutral-500 pb-3 text-lg text-white placeholder-neutral-700 focus:outline-none transition-colors"
              placeholder="SDE-1, Backend Engineer..."
            />
            <div className="flex flex-wrap gap-1.5 mt-4">
              {["SDE-1", "SDE-2", "Backend Engineer", "Frontend Engineer", "Full Stack", "Data Scientist"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`font-mono text-[11px] px-2.5 py-1 rounded transition-colors ${
                    role === r
                      ? "bg-white text-black"
                      : "bg-neutral-900 text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block font-mono text-xs text-neutral-500 uppercase tracking-wider mb-3">
              Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {durations.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDuration(d.value)}
                  className={`py-3 rounded text-center transition-colors ${
                    duration === d.value
                      ? "bg-white text-black"
                      : "bg-neutral-900 text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  <div className="font-mono text-sm font-medium">{d.label}</div>
                  <div className="font-mono text-[10px] mt-0.5 opacity-60">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="border border-neutral-900 rounded-lg p-4">
            <p className="font-mono text-xs text-neutral-500 leading-relaxed">
              Questions are sourced from a database of {companies.length > 0 ? `${companies.length}+` : "100+"} companies&apos;
              real interview problems. If your company is in the database, you&apos;ll get questions actually asked there.
            </p>
          </div>

          {error && (
            <p className="font-mono text-xs text-neutral-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white text-black font-mono text-sm py-3.5 rounded hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Generating..." : "Start interview →"}
          </button>
        </form>
      </div>
    </div>
  );
}
