import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, webcamLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const body = await request.json();
    const { events } = body;

    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: "Events array is required" },
        { status: 400 }
      );
    }

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

    // Calculate scores from events
    const totalWarnings = events.length;

    const postureEvents = events.filter(
      (e: { type: string }) =>
        e.type === "bad_posture" || e.type === "slouching"
    ).length;
    const gazeEvents = events.filter(
      (e: { type: string }) =>
        e.type === "looking_away" ||
        e.type === "no_face" ||
        e.type === "multiple_faces"
    ).length;

    const postureScore = Math.max(
      0,
      100 - Math.round((postureEvents / Math.max(totalWarnings, 1)) * 100)
    );
    const gazeScore = Math.max(
      0,
      100 - Math.round((gazeEvents / Math.max(totalWarnings, 1)) * 100)
    );

    await db.insert(webcamLogs).values({
      sessionId: session.id,
      events,
      postureScore,
      gazeScore,
      totalWarnings,
    });

    return NextResponse.json({
      postureScore,
      gazeScore,
      totalWarnings,
    });
  } catch (error) {
    console.error("Webcam log error:", error);
    return NextResponse.json(
      { error: "Failed to save webcam log" },
      { status: 500 }
    );
  }
}
