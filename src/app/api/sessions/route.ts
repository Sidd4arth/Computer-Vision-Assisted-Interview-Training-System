import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, questions } from "@/db/schema";
import { pickStaticQuestions } from "@/lib/static-questions";
import { v4 as uuidv4 } from "uuid";
import { desc } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyName, role, lpa, duration } = body;

    if (!companyName || !role || !lpa || !duration) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Get the logged-in user (optional — sessions can exist without a user)
    const serverSession = await getServerSession(authOptions);
    const userId = (serverSession?.user as any)?.id
      ? Number((serverSession!.user as any).id)
      : null;

    const uid = uuidv4();

    // Create session
    const [session] = await db
      .insert(sessions)
      .values({
        uid,
        companyName,
        role,
        lpa: String(lpa),
        duration: Number(duration),
        status: "generating",
        ...(userId ? { userId } : {}),
      })
      .returning();

    // Pick random questions from the static pool (always 10 available, pick based on duration)
    const questionCount = duration <= 30 ? 3 : duration <= 60 ? 4 : 5;

    console.log(`Picking ${questionCount} static questions for ${companyName} - ${role}`);

    const generated = pickStaticQuestions(questionCount);

    console.log(`Selected ${generated.length} questions`);

    // Store questions
    for (let i = 0; i < generated.length; i++) {
      const q = generated[i];
      await db.insert(questions).values({
        sessionId: session.id,
        questionIndex: i,
        title: q.title,
        difficulty: q.difficulty,
        description: q.description,
        examples: q.examples,
        testCases: q.testCases,
        starterCode: q.starterCode,
      });
    }

    // Update session status to ready
    const { eq } = await import("drizzle-orm");
    await db
      .update(sessions)
      .set({ status: "ready" })
      .where(eq(sessions.id, session.id));

    return NextResponse.json({ uid, status: "ready" });
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const allSessions = await db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.createdAt))
      .limit(20);

    return NextResponse.json(allSessions);
  } catch (error) {
    console.error("Sessions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
