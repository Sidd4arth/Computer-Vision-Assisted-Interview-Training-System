import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions } from "@/db/schema";
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

    if (session.status !== "ready") {
      return NextResponse.json(
        { error: "Session is not ready to start" },
        { status: 400 }
      );
    }

    await db
      .update(sessions)
      .set({ status: "in_progress", startedAt: new Date() })
      .where(eq(sessions.id, session.id));

    return NextResponse.json({ status: "in_progress" });
  } catch (error) {
    console.error("Session start error:", error);
    return NextResponse.json(
      { error: "Failed to start session" },
      { status: 500 }
    );
  }
}
