import { NextResponse } from "next/server";
import { getChallengeSolutionPayload } from "@/lib/challenge-solution";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payload = await getChallengeSolutionPayload(id);
  if (!payload) {
    return NextResponse.json({ error: "Challenge solution not found" }, { status: 404 });
  }
  return NextResponse.json(payload);
}
