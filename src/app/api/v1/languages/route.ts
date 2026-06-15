import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Returns list of supported languages by this compiler api wrapper
  return NextResponse.json(["javascript", "python", "java", "cpp"]);
}
