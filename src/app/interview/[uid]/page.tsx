import { db } from "@/db";
import { sessions, questions } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import InterviewClient from "./InterviewClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ uid: string }>;
}

export default async function InterviewPage({ params }: PageProps) {
  const { uid } = await params;

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.uid, uid));

  if (!session) {
    notFound();
  }

  if (session.status === "completed") {
    redirect(`/results/${uid}`);
  }

  const sessionQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.sessionId, session.id))
    .orderBy(asc(questions.questionIndex));

  // Filter hidden test cases
  const filteredQuestions = sessionQuestions.map((q) => {
    const visibleTests = (
      q.testCases as Array<{
        input: string;
        expected_output: string;
        is_hidden: boolean;
      }>
    ).filter((tc) => !tc.is_hidden);
    return {
      ...q,
      testCases: visibleTests,
      examples: q.examples as Array<{
        input: string;
        output: string;
        explanation: string;
      }>,
      starterCode: q.starterCode as Record<string, string>,
    };
  });

  return (
    <InterviewClient
      session={{
        uid: session.uid,
        companyName: session.companyName,
        role: session.role,
        duration: session.duration,
        status: session.status,
        startedAt: session.startedAt?.toISOString() || null,
      }}
      questions={filteredQuestions}
    />
  );
}
