import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WorkoutCreateSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = WorkoutCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  const w = parsed.data;
  // Insert workout
  const { data: workout, error: wErr } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      started_at: w.started_at,
      ended_at: w.ended_at ?? null,
      kind: w.kind ?? null,
      source: "manual",
      rpe: w.rpe ?? null,
      notes: w.notes ?? null,
    })
    .select("id")
    .single();
  if (wErr || !workout) return NextResponse.json({ error: wErr?.message ?? "workout_insert_failed" }, { status: 500 });

  // Insert workout_exercises + sets
  for (const [idx, ex] of w.exercises.entries()) {
    const { data: we, error: weErr } = await supabase
      .from("workout_exercises")
      .insert({ workout_id: workout.id, exercise_id: ex.exercise_id, order_idx: idx })
      .select("id")
      .single();
    if (weErr || !we) {
      console.error("we insert", weErr);
      continue;
    }
    const setsRows = ex.sets.map((s, i) => ({
      workout_exercise_id: we.id,
      set_idx: i,
      reps: s.reps ?? null,
      weight_kg: s.weight_kg ?? null,
      rir: s.rir ?? null,
    }));
    const { error: setsErr } = await supabase.from("exercise_sets").insert(setsRows);
    if (setsErr) console.error("sets insert", setsErr);
  }

  return NextResponse.json({ workout_id: workout.id });
}
