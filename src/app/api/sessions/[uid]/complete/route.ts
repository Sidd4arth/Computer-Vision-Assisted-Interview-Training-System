import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, submissions, webcamLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;

    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.uid, uid));

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Get all submissions for scoring
    const allSubmissions = await db
      .select()
      .from(submissions)
      .where(eq(submissions.sessionId, session.id));

    // Get webcam logs
    const logs = await db
      .select()
      .from(webcamLogs)
      .where(eq(webcamLogs.sessionId, session.id));

    // Generate AI feedback (simulates Ollama response)
    const totalSubmitted = allSubmissions.filter(
      (s) => s.submissionType === "submit"
    ).length;
    const totalPassed = allSubmissions
      .filter((s) => s.submissionType === "submit")
      .reduce((acc, s) => acc + (s.totalPassed || 0), 0);
    const totalTests = allSubmissions
      .filter((s) => s.submissionType === "submit")
      .reduce((acc, s) => acc + (s.totalTests || 0), 0);

    const webcamWarnings = logs.reduce(
      (acc, l) => acc + (l.totalWarnings || 0),
      0
    );

    const feedback = generateFeedback(
      session.companyName,
      session.role,
      totalSubmitted,
      totalPassed,
      totalTests,
      webcamWarnings
    );

    await db
      .update(sessions)
      .set({
        status: "completed",
        completedAt: new Date(),
        aiFeedback: feedback,
      })
      .where(eq(sessions.id, session.id));

    return NextResponse.json({ status: "completed", feedback });
  } catch (error) {
    console.error("Session complete error:", error);
    return NextResponse.json(
      { error: "Failed to complete session" },
      { status: 500 }
    );
  }
}

function generateFeedback(
  company: string,
  role: string,
  totalSubmitted: number,
  totalPassed: number,
  totalTests: number,
  webcamWarnings: number
): string {
  const passRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
  const behaviorScore = Math.max(0, 100 - webcamWarnings * 5);

  let codingFeedback = "";
  if (passRate >= 80) {
    codingFeedback = `Excellent coding performance! You passed ${totalPassed}/${totalTests} test cases (${passRate}%). Your problem-solving approach shows strong analytical thinking suitable for ${company}'s ${role} position.`;
  } else if (passRate >= 50) {
    codingFeedback = `Good effort on the coding challenges. You passed ${totalPassed}/${totalTests} test cases (${passRate}%). Consider practicing more edge cases and optimizing your solutions for time complexity.`;
  } else if (totalSubmitted > 0) {
    codingFeedback = `You attempted the coding challenges but passed ${totalPassed}/${totalTests} test cases (${passRate}%). Focus on understanding the problem requirements fully before coding, and practice with similar problems on platforms like LeetCode.`;
  } else {
    codingFeedback = `No solutions were submitted during this session. In a real interview at ${company}, it's important to at least attempt the problems and communicate your thought process.`;
  }

  let behaviorFeedback = "";
  if (behaviorScore >= 80) {
    behaviorFeedback = "Your body language and eye contact were excellent throughout the session, demonstrating professionalism and confidence.";
  } else if (behaviorScore >= 50) {
    behaviorFeedback = `You showed generally good composure but had ${webcamWarnings} behavioral alerts. Try to maintain consistent eye contact with the screen and sit upright throughout the interview.`;
  } else {
    behaviorFeedback = `Your behavioral analysis shows room for improvement with ${webcamWarnings} alerts detected. Practice maintaining focus, good posture, and consistent eye contact during coding sessions.`;
  }

  return `## Mock Interview Feedback — ${company} (${role})\n\n### Coding Performance\n${codingFeedback}\n\n### Behavioral Analysis\n${behaviorFeedback}\n\n### Overall Recommendation\n${passRate >= 60 && behaviorScore >= 60 ? "Based on this session, you show good preparation for the interview. Continue practicing and you'll be well-positioned for success." : "This session highlights areas that need focused improvement. We recommend additional practice sessions before your actual interview."}\n\n*Note: This is an AI-generated assessment based on your mock interview session. Actual interview outcomes depend on many additional factors.*`;
}
