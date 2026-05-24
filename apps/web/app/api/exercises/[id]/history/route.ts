import { NextResponse } from "next/server";
import { getLastTimeForExercise } from "@/lib/queries/exercise-history";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const last = await getLastTimeForExercise(id);
  return NextResponse.json({ last });
}
