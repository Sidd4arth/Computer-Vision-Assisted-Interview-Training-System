import { db } from "@/db";
import { sessions, submissions, webcamLogs } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
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

  const userName =
    serverSession?.user?.name || serverSession?.user?.email || "User";

  // Fetch all completed sessions for this user
  const userSessions = await db
    .select()
    .from(sessions)
    .where(
      and(eq(sessions.userId, Number(userId)), eq(sessions.status, "completed"))
    )
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

    const userSubs = allSubs.filter((sub) =>
      sessionIds.includes(sub.sessionId)
    );

    sessionStats = userSessions.map((s) => {
      const sSubs = userSubs.filter((sub) => sub.sessionId === s.id);
      const sWebcam = allWebcam.filter((w) => w.sessionId === s.id);

      const totalPassed = sSubs.reduce(
        (a, sub) => a + (sub.totalPassed || 0),
        0
      );
      const totalTests = sSubs.reduce(
        (a, sub) => a + (sub.totalTests || 0),
        0
      );
      const accepted = sSubs.filter((sub) => sub.verdict === "Accepted").length;
      const passRate =
        totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

      const postureScore =
        sWebcam.length > 0 ? sWebcam[0].postureScore ?? 0 : 0;
      const gazeScore = sWebcam.length > 0 ? sWebcam[0].gazeScore ?? 0 : 0;
      const totalWarnings =
        sWebcam.length > 0 ? sWebcam[0].totalWarnings ?? 0 : 0;

      const timeTakenMin =
        s.startedAt && s.completedAt
          ? Math.round(
              (new Date(s.completedAt).getTime() -
                new Date(s.startedAt).getTime()) /
                60000
            )
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
        score: Math.round(
          passRate * 0.6 + postureScore * 0.2 + gazeScore * 0.2
        ),
      };
    });

    const n = sessionStats.length;
    const avg = (key: string) =>
      Math.round(sessionStats.reduce((a, s) => a + s[key], 0) / n);

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
  const bestSession = hasData
    ? sessionStats.reduce((a, b) => (a.score > b.score ? a : b))
    : null;

  const kpis = hasData
    ? [
        {
          label: "Avg Score",
          value: `${aggregate.avgScore}`,
          unit: "/100",
          sub: "composite score",
          icon: "⚡",
        },
        {
          label: "Pass Rate",
          value: `${aggregate.avgPassRate}%`,
          unit: "",
          sub: "test cases passed",
          icon: "✓",
        },
        {
          label: "Problems Solved",
          value: `${aggregate.totalAccepted}`,
          unit: "",
          sub: "accepted verdicts",
          icon: "★",
        },
        {
          label: "Warnings",
          value: `${aggregate.totalWarnings}`,
          unit: "",
          sub: "behavioral flags",
          icon: "⚠",
        },
      ]
    : [];

  const behavKpis = hasData
    ? [
        {
          label: "Avg Posture",
          value: `${aggregate.avgPosture}%`,
          icon: "🧍",
        },
        {
          label: "Avg Eye Contact",
          value: `${aggregate.avgGaze}%`,
          icon: "👁️",
        },
        {
          label: "Sessions",
          value: `${aggregate.totalSessions}`,
          icon: "📋",
        },
      ]
    : [];

  function scoreColor(score: number) {
    if (score >= 80) return { color: "#34d399" };
    if (score >= 55) return { color: "#fbbf24" };
    return { color: "#f87171" };
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: "#000000",
        color: "#f5f5f5",
      }}
    >
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-20 px-6 py-4"
        style={{
          borderBottom: "1px solid #171717",
          background: "#000000",
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="font-mono text-sm tracking-tight text-neutral-400 hover:text-white transition-colors"
            >
              MockPrep
            </Link>
            <span style={{ color: "#262626", fontSize: "1.25rem" }}>|</span>
            <span
              className="font-mono text-xs uppercase tracking-widest text-neutral-600"
            >
              Dashboard
            </span>
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
              className="font-mono text-xs border border-neutral-800 hover:border-neutral-500 px-4 py-2 rounded transition-colors"
              style={{
                color: "#e5e5e5",
                background: "transparent",
              }}
            >
              + New Session
            </Link>
            <AuthNav />
          </div>
        </div>
      </nav>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <p
              className="font-mono text-xs uppercase tracking-widest text-neutral-600"
            >
              Analytics Dashboard
            </p>
          </div>
          <h1
            className="text-3xl font-serif text-white font-bold mb-3"
            style={{ lineHeight: 1.15 }}
          >
            Welcome back, {userName.split(" ")[0]}
          </h1>
          <p className="text-neutral-500 text-sm">
            {hasData
              ? `${aggregate.totalSessions} completed session${
                  aggregate.totalSessions !== 1 ? "s" : ""
                } · performance tracked`
              : "Complete your first interview session to see analytics here."}
          </p>
        </div>

        {hasData ? (
          <>
            {/* ── KPI Cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {kpis.map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl p-5 border border-neutral-900"
                  style={{
                    background: "#000000",
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-sm text-neutral-600">{kpi.icon}</span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-500">
                      {kpi.label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="font-mono text-3xl font-bold text-white">
                      {kpi.value}
                    </span>
                    {kpi.unit && (
                      <span className="font-mono text-xs text-neutral-600">
                        {kpi.unit}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-neutral-600">
                    {kpi.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Behavioral KPIs ────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-4 mb-10">
              {behavKpis.map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl p-4 text-center border border-neutral-900"
                  style={{
                    background: "#000000",
                  }}
                >
                  <div className="text-lg mb-1">{kpi.icon}</div>
                  <div className="font-mono text-xl font-bold text-neutral-200 mb-0.5">
                    {kpi.value}
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-neutral-600">
                    {kpi.label}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Charts ─────────────────────────────────────────────────── */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <p className="font-mono text-xs uppercase tracking-widest text-neutral-600">
                  Performance Charts
                </p>
              </div>
              <DashboardCharts sessions={sessionStats} aggregate={aggregate} />
            </div>

            {/* ── Session History Table ───────────────────────────────────── */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <p className="font-mono text-xs uppercase tracking-widest text-neutral-600">
                  Session History
                </p>
              </div>
              <div
                className="rounded-xl overflow-hidden border border-neutral-900"
                style={{
                  background: "#000000",
                }}
              >
                <table className="w-full">
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid #171717",
                        background: "#050505",
                      }}
                    >
                      {[
                        "Company",
                        "Role",
                        "Date",
                        "Duration",
                        "Score",
                        "Pass Rate",
                        "Accepted",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left font-mono text-[9px] uppercase tracking-widest px-4 py-3 text-neutral-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...sessionStats].reverse().map((s) => {
                      const sc = scoreColor(s.score);
                      return (
                        <tr
                          key={s.id}
                          className="tr-hover"
                          style={{ borderBottom: "1px solid #171717" }}
                        >
                          <td className="px-4 py-3 text-sm font-semibold text-neutral-200">
                            {s.companyName}
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-400">
                            {s.role}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-neutral-600">
                            {new Date(s.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-neutral-600">
                            {s.duration}m
                          </td>
                          <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: sc.color }}>
                            {s.score}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-neutral-300">
                            {s.passRate}%
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-neutral-300">
                            {s.accepted}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/results/${s.uid}`}
                              className="inline-block font-mono text-[10px] px-3 py-1 rounded border border-neutral-800 hover:border-neutral-500 text-neutral-400 hover:text-white transition-colors"
                            >
                              View →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Best Session Highlight ─────────────────────────────────── */}
            {bestSession && (
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                  <p className="font-mono text-xs uppercase tracking-widest text-neutral-600">
                    Best Session
                  </p>
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded border border-neutral-800 text-neutral-400 bg-neutral-950">
                    🏆 Top Score
                  </span>
                </div>
                <Link href={`/results/${bestSession.uid}`}>
                  <div
                    className="rounded-xl p-6 border border-neutral-900 hover:border-neutral-700 transition-colors"
                    style={{
                      background: "#000000",
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white text-xl font-bold mb-1">
                          {bestSession.companyName}
                        </p>
                        <p className="text-sm text-neutral-400">
                          {bestSession.role}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-3xl font-bold text-white">
                          {bestSession.score}
                        </div>
                        <div className="font-mono text-[9px] uppercase tracking-wider text-neutral-600">
                          Score
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-4 gap-4">
                      {[
                        {
                          l: "Pass Rate",
                          v: `${bestSession.passRate}%`,
                        },
                        {
                          l: "Posture",
                          v: `${bestSession.postureScore}%`,
                        },
                        {
                          l: "Gaze",
                          v: `${bestSession.gazeScore}%`,
                        },
                        {
                          l: "Warnings",
                          v: `${bestSession.totalWarnings}`,
                        },
                      ].map(({ l, v }) => (
                        <div
                          key={l}
                          className="rounded p-3 text-center border border-neutral-950 bg-neutral-950/50"
                        >
                          <div className="font-mono text-base font-bold text-neutral-200">
                            {v}
                          </div>
                          <div className="font-mono text-[9px] uppercase tracking-wider text-neutral-600 mt-0.5">
                            {l}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="font-mono text-[10px] mt-4 text-neutral-600 hover:text-neutral-400 transition-colors">
                      View full results →
                    </p>
                  </div>
                </Link>
              </div>
            )}
          </>
        ) : (
          /* ── Empty state ──────────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-8 border border-neutral-800 text-neutral-400">
              <span className="text-2xl">🎯</span>
            </div>
            <h2 className="text-2xl font-serif text-white font-bold mb-3">
              No sessions yet
            </h2>
            <p className="text-sm text-neutral-500 mb-8 max-w-xs leading-relaxed">
              Complete an interview session to start tracking your performance
              and behavioral metrics here.
            </p>
            <Link
              href="/new-session"
              className="inline-block font-mono text-sm bg-white text-black px-6 py-3 rounded hover:bg-neutral-200 transition-colors"
            >
              Start a session →
            </Link>
          </div>
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer
        className="px-6 py-6 border-t border-neutral-900"
        style={{ background: "#000000" }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-neutral-700">
          <span>Interview Evaluator Model</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
