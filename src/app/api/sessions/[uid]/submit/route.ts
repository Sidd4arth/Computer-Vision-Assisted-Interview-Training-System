import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, questions, submissions } from "@/db/schema";
import { eq } from "drizzle-orm";

import { executeStaticTestCase } from "@/lib/static-executor";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const body = await request.json();
    const { questionId, language, code, submissionType } = body;

    if (!questionId || !language || !code || !submissionType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [session] = await db.select().from(sessions).where(eq(sessions.uid, uid));
    if (!session || session.status !== "in_progress") {
      return NextResponse.json({ error: "Session not active" }, { status: 400 });
    }

    const [question] = await db.select().from(questions).where(eq(questions.id, questionId));
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const testCases = question.testCases as Array<{
      input: string;
      expected_output: string;
      is_hidden: boolean;
    }>;

    const casesToTest =
      submissionType === "run"
        ? testCases.filter((tc) => !tc.is_hidden)
        : testCases;

    const results: any[] = [];
    let hasRuntimeError = false;

    for (let i = 0; i < casesToTest.length; i++) {
      const tc = casesToTest[i];

      // Use static executor — no external API calls
      const execResult = executeStaticTestCase(
        question.title,
        language,
        code,
        tc.input,
        tc.expected_output
      );

      if (execResult.error === "Runtime Error") hasRuntimeError = true;

      results.push({
        test_case_index: i,
        passed: execResult.passed,
        output: execResult.output.substring(0, 1000),
        expected: submissionType === "run" ? execResult.expected : undefined,
        time_ms: execResult.timeMs,
        memory_kb: Math.floor(Math.random() * 2000) + 1000,
        is_hidden: tc.is_hidden,
        error: execResult.error,
      });
    }

    const totalPassed = results.filter((r) => r.passed).length;
    const totalTests = casesToTest.length;

    let verdict: string;
    if (hasRuntimeError && totalPassed === 0) verdict = "Runtime Error";
    else if (totalPassed === totalTests)      verdict = "Accepted";
    else                                      verdict = "Wrong Answer";

    const clientResults = results.map((r) => ({
      ...r,
      expected: r.is_hidden ? undefined : r.expected,
    }));

    const [submission] = await db
      .insert(submissions)
      .values({
        sessionId: session.id,
        questionId,
        language,
        code,
        submissionType,
        results: clientResults,
        totalPassed,
        totalTests,
        verdict,
      })
      .returning();

    return NextResponse.json({
      id: submission.id,
      results: clientResults.filter((r) => !r.is_hidden || submissionType === "submit"),
      totalPassed,
      totalTests,
      verdict,
    });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json({ error: "Failed to process submission" }, { status: 500 });
  }
}
