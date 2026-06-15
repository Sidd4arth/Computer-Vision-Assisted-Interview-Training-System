import { NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, questions, submissions, webcamLogs } from "@/db/schema";
import { eq, desc, and, asc } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const serverSession = await getServerSession(authOptions);
  const userId = (serverSession?.user as any)?.id ?? null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all completed sessions for this user
  const userSessions = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, Number(userId)), eq(sessions.status, "completed")))
    .orderBy(asc(sessions.createdAt));

  if (userSessions.length === 0) {
    return NextResponse.json({ sessions: [], aggregate: null });
  }

  const sessionIds = userSessions.map((s) => s.id);

  // Fetch submissions and webcam logs for all sessions
  const allSubmissions = await db
    .select()
    .from(submissions)
    .where(eq(submissions.submissionType, "submit"))
    .orderBy(asc(submissions.createdAt));

  const allWebcam = await db
    .select()
    .from(webcamLogs)
    .orderBy(asc(webcamLogs.createdAt));

  // Build per-session stats
  const sessionStats = userSessions.map((s) => {
    const sSubs = allSubmissions.filter((sub) => sub.sessionId === s.id);
    const sWebcam = allWebcam.filter((w) => w.sessionId === s.id);

    const totalPassed = sSubs.reduce((a, sub) => a + (sub.totalPassed || 0), 0);
    const totalTests = sSubs.reduce((a, sub) => a + (sub.totalTests || 0), 0);
    const accepted = sSubs.filter((sub) => sub.verdict === "Accepted").length;
    const passRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

    const postureScore = sWebcam.length > 0 ? sWebcam[0].postureScore ?? 0 : 0;
    const gazeScore = sWebcam.length > 0 ? sWebcam[0].gazeScore ?? 0 : 0;
    const totalWarnings = sWebcam.length > 0 ? sWebcam[0].totalWarnings ?? 0 : 0;

    // Time taken (seconds between startedAt and completedAt)
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
      score: Math.round((passRate * 0.6 + postureScore * 0.2 + gazeScore * 0.2)),
    };
  });

  // Aggregate stats
  const totalSessions = sessionStats.length;
  const avgPassRate = Math.round(sessionStats.reduce((a, s) => a + s.passRate, 0) / totalSessions);
  const avgScore = Math.round(sessionStats.reduce((a, s) => a + s.score, 0) / totalSessions);
  const avgPosture = Math.round(sessionStats.reduce((a, s) => a + s.postureScore, 0) / totalSessions);
  const avgGaze = Math.round(sessionStats.reduce((a, s) => a + s.gazeScore, 0) / totalSessions);
  const totalWarningsAll = sessionStats.reduce((a, s) => a + s.totalWarnings, 0);
  const totalAccepted = sessionStats.reduce((a, s) => a + s.accepted, 0);

  // Verdict distribution across all submissions
  const allUserSubs = allSubmissions.filter((sub) => sessionIds.includes(sub.sessionId));
  const verdictDist: Record<string, number> = {};
  allUserSubs.forEach((sub) => {
    const v = sub.verdict || "Unknown";
    verdictDist[v] = (verdictDist[v] || 0) + 1;
  });

  // Company distribution
  const companyDist: Record<string, number> = {};
  userSessions.forEach((s) => {
    companyDist[s.companyName] = (companyDist[s.companyName] || 0) + 1;
  });

  // Language distribution
  const langDist: Record<string, number> = {};
  allUserSubs.forEach((sub) => {
    langDist[sub.language] = (langDist[sub.language] || 0) + 1;
  });

  return NextResponse.json({
    sessions: sessionStats,
    aggregate: {
      totalSessions,
      avgPassRate,
      avgScore,
      avgPosture,
      avgGaze,
      totalWarnings: totalWarningsAll,
      totalAccepted,
      verdictDist,
      companyDist,
      langDist,
    },
  });
}
