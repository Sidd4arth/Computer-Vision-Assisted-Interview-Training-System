import { NextResponse } from "next/server";
import { getAvailableCompanies } from "@/lib/github-questions";

export async function GET() {
  try {
    const companies = await getAvailableCompanies();
    return NextResponse.json({ companies });
  } catch (error) {
    console.error("Failed to fetch companies:", error);
    return NextResponse.json({ companies: [] });
  }
}
