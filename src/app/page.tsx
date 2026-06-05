import Link from "next/link";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let recentSessions: Array<{
    id: number;
    uid: string;
    companyName: string;
    role: string;
    lpa: string;
    duration: number;
    status: string;
    createdAt: Date;
  }> = [];

  try {
    recentSessions = await db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.createdAt))
      .limit(5);
  } catch {
    // Table may not exist yet
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b border-neutral-900 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-mono text-sm tracking-tight text-neutral-400">
            Interview Evaluator Model
          </span>
          <Link
            href="/new-session"
            className="font-mono text-xs border border-neutral-700 hover:border-neutral-500 px-4 py-2 rounded transition-colors"
          >
            New Session
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl w-full py-24">
          <p className="font-mono text-xs text-neutral-600 uppercase tracking-widest mb-6">
            Mock Interview Platform
          </p>
          <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] mb-6 text-white">
            Practice interviews,<br />
            <span className="italic text-neutral-400">before the real one.</span>
          </h1>
          <p className="text-neutral-500 text-lg leading-relaxed max-w-lg mb-10">
            Real questions from 100+ companies. Timed coding rounds with behavioral analysis. Get feedback that matters.
          </p>
          <Link
            href="/new-session"
            className="inline-block font-mono text-sm bg-white text-black px-6 py-3 rounded hover:bg-neutral-200 transition-colors"
          >
            Start a session →
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-neutral-900 px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <p className="font-mono text-xs text-neutral-600 uppercase tracking-widest mb-10">
            How it works
          </p>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Configure", desc: "Pick company, role, and duration." },
              { step: "02", title: "Generate", desc: "Real interview questions are fetched." },
              { step: "03", title: "Solve", desc: "Code in a timed LeetCode-style editor." },
              { step: "04", title: "Review", desc: "Get performance analytics and feedback." },
            ].map((item) => (
              <div key={item.step}>
                <span className="font-mono text-xs text-neutral-700">{item.step}</span>
                <h3 className="font-serif text-xl mt-2 mb-2 text-white">{item.title}</h3>
                <p className="text-neutral-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="border-t border-neutral-900 px-6 py-20">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-px bg-neutral-900">
          {[
            { label: "Coding Editor", desc: "Multi-language editor with run & submit." },
            { label: "Webcam Analysis", desc: "Posture and gaze detection in-browser." },
            { label: "Timed Sessions", desc: "30, 45, 60, or 90 minute rounds." },
            { label: "100+ Companies", desc: "Google, Amazon, Meta, and more." },
            { label: "Privacy First", desc: "No video uploaded. Ever." },
            { label: "AI Feedback", desc: "Personalized review after each session." },
          ].map((item) => (
            <div key={item.label} className="bg-neutral-950 p-6">
              <h4 className="font-mono text-xs text-neutral-400 mb-2">{item.label}</h4>
              <p className="text-neutral-600 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <section className="border-t border-neutral-900 px-6 py-16">
          <div className="max-w-5xl mx-auto">
            <p className="font-mono text-xs text-neutral-600 uppercase tracking-widest mb-6">
              Recent Sessions
            </p>
            <div className="space-y-1">
              {recentSessions.map((s) => (
                <Link
                  key={s.id}
                  href={
                    s.status === "completed"
                      ? `/results/${s.uid}`
                      : s.status === "ready" || s.status === "in_progress"
                        ? `/interview/${s.uid}`
                        : "#"
                  }
                  className="flex items-center justify-between py-3 px-4 rounded hover:bg-neutral-900/50 transition-colors group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="font-mono text-xs text-neutral-700 shrink-0">
                      {new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span className="text-sm text-neutral-300 truncate">
                      {s.companyName} — {s.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-neutral-600">{s.duration}m</span>
                    <span className={`font-mono text-[10px] uppercase tracking-wider ${
                      s.status === "completed" ? "text-neutral-400" : "text-neutral-600"
                    }`}>
                      {s.status === "in_progress" ? "active" : s.status}
                    </span>
                    <span className="text-neutral-700 group-hover:text-neutral-400 transition-colors">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-neutral-900 px-6 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between font-mono text-[10px] text-neutral-700 uppercase tracking-widest">
          <span>Interview Evaluator Model</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
