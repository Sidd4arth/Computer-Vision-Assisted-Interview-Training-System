import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, questions, submissions, webcamLogs } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

export async function GET(
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

    // Get questions (filter hidden test cases for non-completed sessions)
    const sessionQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.sessionId, session.id))
      .orderBy(asc(questions.questionIndex));

    const filteredQuestions = sessionQuestions.map((q) => {
      if (session.status !== "completed") {
        // Filter out hidden test cases
        const visibleTests = (
          q.testCases as Array<{
            input: string;
            expected_output: string;
            is_hidden: boolean;
          }>
        ).filter((tc) => !tc.is_hidden);
        return { ...q, testCases: visibleTests };
      }
      return q;
    });

    // Get submissions
    const sessionSubmissions = await db
      .select()
      .from(submissions)
      .where(eq(submissions.sessionId, session.id))
      .orderBy(asc(submissions.createdAt));

    // Get webcam logs
    const sessionWebcamLogs = await db
      .select()
      .from(webcamLogs)
      .where(eq(webcamLogs.sessionId, session.id));

    return NextResponse.json({
      session,
      questions: filteredQuestions,
      submissions: sessionSubmissions,
      webcamLogs: sessionWebcamLogs,
    });
  } catch (error) {
    console.error("Session fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}
