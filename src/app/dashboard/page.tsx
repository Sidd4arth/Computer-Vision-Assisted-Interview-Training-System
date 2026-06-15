import { db } from "@/db";
import { sessions, submissions, webcamLogs } from "@/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardCharts from "./DashboardCharts";
import { AuthNav } from "../auth-nav";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const serverSession = await getServerSession(authOptions);
  const userId = (serverSession?.user as any)?.id ?? null;

  if (!userId) {
    redirect("/login");
  }

  const userName = serverSession?.user?.name || serverSession?.user?.email || "User";

  // Fetch all completed sessions for this user
  const userSessions = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, Number(userId)), eq(sessions.status, "completed")))
    .orderBy(asc(sessions.createdAt));

  const sessionIds = userSessions.map((s) => s.id);

  let sessionStats: any[] = [];
  let aggregate: any = null;

  if (sessionIds.length > 0) {
    const allSubs = await db
      .select()
      .from(submissions)
      .where(eq(submissions.submissionType, "submit"))
      .orderBy(asc(submissions.createdAt));

    const allWebcam = await db
      .select()
      .from(webcamLogs)
      .orderBy(asc(webcamLogs.createdAt));

    const userSubs = allSubs.filter((sub) => sessionIds.includes(sub.sessionId));

    sessionStats = userSessions.map((s) => {
      const sSubs = userSubs.filter((sub) => sub.sessionId === s.id);
      const sWebcam = allWebcam.filter((w) => w.sessionId === s.id);

      const totalPassed = sSubs.reduce((a, sub) => a + (sub.totalPassed || 0), 0);
      const totalTests = sSubs.reduce((a, sub) => a + (sub.totalTests || 0), 0);
      const accepted = sSubs.filter((sub) => sub.verdict === "Accepted").length;
      const passRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

      const postureScore = sWebcam.length > 0 ? sWebcam[0].postureScore ?? 0 : 0;
      const gazeScore = sWebcam.length > 0 ? sWebcam[0].gazeScore ?? 0 : 0;
      const totalWarnings = sWebcam.length > 0 ? sWebcam[0].totalWarnings ?? 0 : 0;

      const timeTakenMin =
        s.startedAt && s.completedAt
          ? Math.round((new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime()) / 60000)
          : s.duration;

      return {
        id: s.id,
        uid: s.uid,
        companyName: s.companyName,
        role: s.role,
        duration: s.duration,
        timeTaken: timeTakenMin,
        createdAt: s.createdAt,
        completedAt: s.completedAt,
        passRate,
        accepted,
        totalSubmissions: sSubs.length,
        postureScore,
        gazeScore,
        totalWarnings,
        focusScore: Math.max(0, 100 - totalWarnings * 5),
        score: Math.round(passRate * 0.6 + postureScore * 0.2 + gazeScore * 0.2),
      };
    });

    const n = sessionStats.length;
    const avg = (key: string) => Math.round(sessionStats.reduce((a, s) => a + s[key], 0) / n);

    const verdictDist: Record<string, number> = {};
    userSubs.forEach((sub) => {
      const v = sub.verdict || "Unknown";
      verdictDist[v] = (verdictDist[v] || 0) + 1;
    });

    const langDist: Record<string, number> = {};
    userSubs.forEach((sub) => {
      langDist[sub.language] = (langDist[sub.language] || 0) + 1;
    });

    const companyDist: Record<string, number> = {};
    userSessions.forEach((s) => {
      companyDist[s.companyName] = (companyDist[s.companyName] || 0) + 1;
    });

    aggregate = {
      totalSessions: n,
      avgPassRate: avg("passRate"),
      avgScore: avg("score"),
      avgPosture: avg("postureScore"),
      avgGaze: avg("gazeScore"),
      totalWarnings: sessionStats.reduce((a, s) => a + s.totalWarnings, 0),
      totalAccepted: sessionStats.reduce((a, s) => a + s.accepted, 0),
      verdictDist,
      langDist,
      companyDist,
    };
  }

  const hasData = sessionStats.length > 0;

  // Best and worst session
  const bestSession = hasData
    ? sessionStats.reduce((a, b) => (a.score > b.score ? a : b))
    : null;
  const latestSession = hasData ? sessionStats[sessionStats.length - 1] : null;

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Nav */}
      <nav className="border-b border-neutral-900 px-6 py-4 sticky top-0 bg-neutral-950/90 backdrop-blur-sm z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-mono text-sm text-neutral-500 hover:text-neutral-200 transition-colors">
              MockPrep
            </Link>
            <span className="text-neutral-800">|</span>
            <span className="font-mono text-xs text-neutral-400">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/create"
              className="font-mono text-xs text-neutral-500 hover:text-neutral-200 transition-colors"
            >
              Create
            </Link>
            <Link
              href="/new-session"
              className="font-mono text-xs border border-neutral-700 hover:border-neutral-500 px-4 py-2 rounded transition-colors"
            >
              New Session
            </Link>
            <AuthNav />
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <p className="font-mono text-xs text-neutral-600 uppercase tracking-widest mb-3">Analytics</p>
          <h1 className="font-serif text-4xl md:text-5xl text-white mb-2">
            Your Progress
          </h1>
          <p className="text-neutral-500 text-base">
            {hasData
              ? `${aggregate.totalSessions} completed session${aggregate.totalSessions !== 1 ? "s" : ""} tracked`
              : "Complete your first interview session to see analytics here."}
          </p>
        </div>

        {hasData ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-neutral-900 rounded-xl overflow-hidden mb-8">
              {[
                {
                  label: "Avg Score",
                  value: `${aggregate.avgScore}`,
                  unit: "/100",
                  sub: "composite metric",
                },
                {
                  label: "Avg Pass Rate",
                  value: `${aggregate.avgPassRate}%`,
                  unit: "",
                  sub: "test cases passed",
                },
                {
                  label: "Problems Solved",
                  value: `${aggregate.totalAccepted}`,
                  unit: "",
                  sub: "accepted verdicts",
                },
                {
                  label: "Warnings",
                  value: `${aggregate.totalWarnings}`,
                  unit: "",
                  sub: "behavioral flags",
                },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-neutral-950 p-6">
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="font-mono text-3xl text-white">{kpi.value}</span>
                    {kpi.unit && (
                      <span className="font-mono text-sm text-neutral-600">{kpi.unit}</span>
                    )}
                  </div>
                  <div className="font-mono text-[10px] text-neutral-600 uppercase tracking-wider">{kpi.label}</div>
                  <div className="text-[10px] text-neutral-700 mt-0.5">{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Behavioral KPIs */}
            <div className="grid grid-cols-3 gap-px bg-neutral-900 rounded-xl overflow-hidden mb-10">
              {[
                { label: "Avg Posture", value: `${aggregate.avgPosture}%` },
                { label: "Avg Eye Contact", value: `${aggregate.avgGaze}%` },
                { label: "Sessions", value: `${aggregate.totalSessions}` },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-neutral-950 p-5 text-center">
                  <div className="font-mono text-xl text-white mb-0.5">{kpi.value}</div>
                  <div className="font-mono text-[10px] text-neutral-600 uppercase tracking-wider">{kpi.label}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="mb-10">
              <p className="font-mono text-xs text-neutral-600 uppercase tracking-widest mb-6">Performance Charts</p>
              <DashboardCharts sessions={sessionStats} aggregate={aggregate} />
            </div>

            {/* Session History Table */}
            <div className="mb-10">
              <p className="font-mono text-xs text-neutral-600 uppercase tracking-widest mb-4">Session History</p>
              <div className="border border-neutral-900 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-900">
                      {["Company", "Role", "Date", "Duration", "Score", "Pass Rate", "Accepted", ""].map((h) => (
                        <th
                          key={h}
                          className="text-left font-mono text-[9px] text-neutral-700 uppercase tracking-widest px-4 py-3"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...sessionStats].reverse().map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-neutral-900/50 hover:bg-neutral-900/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-neutral-200">{s.companyName}</td>
                        <td className="px-4 py-3 text-sm text-neutral-500">{s.role}</td>
                        <td className="px-4 py-3 font-mono text-xs text-neutral-700">
                          {new Date(s.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-neutral-600">{s.duration}m</td>
                        <td className="px-4 py-3 font-mono text-xs text-neutral-300">{s.score}</td>
                        <td className="px-4 py-3 font-mono text-xs text-neutral-400">{s.passRate}%</td>
                        <td className="px-4 py-3 font-mono text-xs text-neutral-600">{s.accepted}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/results/${s.uid}`}
                            className="font-mono text-[10px] text-neutral-700 hover:text-neutral-400 transition-colors"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Best Session Highlight */}
            {bestSession && (
              <div className="mb-10">
                <p className="font-mono text-xs text-neutral-600 uppercase tracking-widest mb-4">Best Session</p>
                <Link href={`/results/${bestSession.uid}`}>
                  <div className="border border-neutral-800 rounded-xl p-6 hover:border-neutral-600 transition-colors group">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white text-lg font-serif mb-1">{bestSession.companyName}</p>
                        <p className="text-neutral-500 text-sm">{bestSession.role}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-3xl text-neutral-200">{bestSession.score}</div>
                        <div className="font-mono text-[10px] text-neutral-700 uppercase">Score</div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-6">
                      {[
                        { l: "Pass Rate", v: `${bestSession.passRate}%` },
                        { l: "Posture", v: `${bestSession.postureScore}%` },
                        { l: "Gaze", v: `${bestSession.gazeScore}%` },
                        { l: "Warnings", v: `${bestSession.totalWarnings}` },
                      ].map(({ l, v }) => (
                        <div key={l}>
                          <div className="font-mono text-sm text-neutral-300">{v}</div>
                          <div className="font-mono text-[9px] text-neutral-700 uppercase tracking-wider">{l}</div>
                        </div>
                      ))}
                    </div>
                    <p className="font-mono text-[10px] text-neutral-700 group-hover:text-neutral-500 transition-colors mt-4">
                      View full results →
                    </p>
                  </div>
                </Link>
              </div>
            )}
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 border border-neutral-800 rounded-full flex items-center justify-center mb-6">
              <span className="font-mono text-2xl text-neutral-700">◈</span>
            </div>
            <p className="font-serif text-2xl text-neutral-400 mb-3">No sessions yet</p>
            <p className="text-neutral-700 text-sm mb-8 max-w-xs">
              Complete an interview session to start tracking your performance and behavioral metrics here.
            </p>
            <Link
              href="/new-session"
              className="font-mono text-sm bg-white text-black px-6 py-3 rounded hover:bg-neutral-200 transition-colors"
            >
              Start a session →
            </Link>
          </div>
        )}
      </div>

      <footer className="border-t border-neutral-900 px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between font-mono text-[10px] text-neutral-700 uppercase tracking-widest">
          <span>Interview Evaluator Model</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
