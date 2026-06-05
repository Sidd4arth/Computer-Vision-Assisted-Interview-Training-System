import { db } from "@/db";
import { sessions, questions, submissions, webcamLogs } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import ResultsCharts from "./ResultsCharts";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ uid: string }>;
}

export default async function ResultsPage({ params }: PageProps) {
  const { uid } = await params;

  const [session] = await db.select().from(sessions).where(eq(sessions.uid, uid));
  if (!session) notFound();

  const qs = await db.select().from(questions).where(eq(questions.sessionId, session.id)).orderBy(asc(questions.questionIndex));
  const subs = await db.select().from(submissions).where(and(eq(submissions.sessionId, session.id), eq(submissions.submissionType, "submit"))).orderBy(asc(submissions.createdAt));
  const wLogs = await db.select().from(webcamLogs).where(eq(webcamLogs.sessionId, session.id));

  const attempted = new Set(subs.map((s) => s.questionId)).size;
  const totalPassed = subs.reduce((a, s) => a + (s.totalPassed || 0), 0);
  const totalTests = subs.reduce((a, s) => a + (s.totalTests || 0), 0);
  const accepted = subs.filter((s) => s.verdict === "Accepted").length;

  const postureScore = wLogs.length > 0 ? wLogs[0].postureScore ?? 85 : 85;
  const gazeScore = wLogs.length > 0 ? wLogs[0].gazeScore ?? 80 : 80;
  const totalWarnings = wLogs.length > 0 ? wLogs[0].totalWarnings ?? 0 : 0;
  const webcamEvents = wLogs.length > 0
    ? (wLogs[0].events as Array<{ timestamp: number; type: string; message: string; severity: string }>)
    : [];

  const passRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

  const qResults = qs.map((q) => {
    const qSubs = subs.filter((s) => s.questionId === q.id);
    const last = qSubs[qSubs.length - 1];
    return {
      title: q.title,
      difficulty: q.difficulty,
      attempted: qSubs.length > 0,
      verdict: last?.verdict || "—",
      passed: last?.totalPassed || 0,
      total: last?.totalTests || 0,
    };
  });

  return (
    <div className="min-h-screen">
      <nav className="border-b border-neutral-900 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-mono text-sm text-neutral-400 hover:text-neutral-200 transition-colors">
            ← Home
          </Link>
          <Link href="/new-session" className="font-mono text-xs border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded transition-colors text-neutral-400">
            New Session
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <p className="font-mono text-xs text-neutral-600 uppercase tracking-widest mb-3">Results</p>
        <h1 className="font-serif text-3xl text-white mb-1">{session.companyName}</h1>
        <p className="text-neutral-500 mb-10">
          {session.role} · {session.duration} min
          {session.completedAt && ` · ${new Date(session.completedAt).toLocaleDateString()}`}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-neutral-900 rounded-lg overflow-hidden mb-10">
          {[
            { label: "Attempted", value: `${attempted}/${qs.length}` },
            { label: "Tests Passed", value: `${totalPassed}/${totalTests}` },
            { label: "Pass Rate", value: `${passRate}%` },
            { label: "Accepted", value: `${accepted}` },
          ].map((s) => (
            <div key={s.label} className="bg-neutral-950 p-5">
              <div className="font-mono text-2xl text-white mb-1">{s.value}</div>
              <div className="font-mono text-[10px] text-neutral-600 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-4 mb-10">
          <ResultsCharts
            questionResults={qResults}
            postureScore={postureScore}
            gazeScore={gazeScore}
            totalWarnings={totalWarnings}
            passRate={passRate}
            webcamEvents={webcamEvents}
          />
        </div>

        {/* Questions */}
        <div className="mb-10">
          <p className="font-mono text-xs text-neutral-600 uppercase tracking-widest mb-4">Questions</p>
          <div className="space-y-1">
            {qResults.map((q, i) => (
              <div key={i} className="flex items-center justify-between py-3 px-4 border border-neutral-900 rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs text-neutral-700 w-5">{i + 1}</span>
                  <span className="text-sm text-neutral-300 truncate">{q.title}</span>
                  <span className="font-mono text-[10px] text-neutral-700 uppercase">{q.difficulty}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-mono text-xs text-neutral-600">{q.attempted ? `${q.passed}/${q.total}` : "—"}</span>
                  <span className={`font-mono text-[10px] uppercase ${
                    q.verdict === "Accepted" ? "text-neutral-300" : q.attempted ? "text-neutral-500" : "text-neutral-700"
                  }`}>
                    {q.verdict}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Behavior */}
        <div className="mb-10">
          <p className="font-mono text-xs text-neutral-600 uppercase tracking-widest mb-4">Behavioral</p>
          <div className="grid grid-cols-3 gap-px bg-neutral-900 rounded-lg overflow-hidden">
            {[
              { label: "Posture", value: `${postureScore}%` },
              { label: "Eye Contact", value: `${gazeScore}%` },
              { label: "Warnings", value: `${totalWarnings}` },
            ].map((s) => (
              <div key={s.label} className="bg-neutral-950 p-5 text-center">
                <div className="font-mono text-xl text-white mb-1">{s.value}</div>
                <div className="font-mono text-[10px] text-neutral-600 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Feedback */}
        {session.aiFeedback && (
          <div className="mb-10">
            <p className="font-mono text-xs text-neutral-600 uppercase tracking-widest mb-4">Feedback</p>
            <div className="border border-neutral-900 rounded-lg p-6">
              {session.aiFeedback.split("\n").map((line, i) => {
                if (line.startsWith("## ")) return <h2 key={i} className="font-serif text-lg text-white mt-4 mb-2">{line.replace("## ", "")}</h2>;
                if (line.startsWith("### ")) return <h3 key={i} className="font-mono text-xs text-neutral-400 uppercase tracking-wider mt-4 mb-1">{line.replace("### ", "")}</h3>;
                if (line.startsWith("*")) return <p key={i} className="font-mono text-[10px] text-neutral-700 italic mt-4">{line.replace(/\*/g, "")}</p>;
                return <p key={i} className="text-neutral-400 text-sm leading-relaxed">{line}</p>;
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center py-8">
          <Link href="/new-session" className="font-mono text-sm bg-white text-black px-6 py-2.5 rounded hover:bg-neutral-200 transition-colors">
            New interview →
          </Link>
          <Link href="/" className="font-mono text-sm border border-neutral-800 text-neutral-400 px-6 py-2.5 rounded hover:border-neutral-600 transition-colors">
            Home
          </Link>
        </div>
      </div>

      <footer className="border-t border-neutral-900 px-6 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between font-mono text-[10px] text-neutral-700 uppercase tracking-widest">
          <span>Interview Evaluator Model</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
