import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WorkoutCreateSchema } from "@/lib/schemas";

export const runtime = "nodejs";

/** GET — fetch a single workout with exercises + sets (for the edit screen). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("workouts")
    .select(`
      id, started_at, ended_at, kind, source, rpe, notes,
      workout_exercises (
        id, order_idx, exercise_id,
        exercises ( id, name, primary_muscle, equipment, demo_gif_url ),
        exercise_sets ( id, set_idx, reps, weight_kg, rir )
      )
    `)
    .eq("id", id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ workout: data });
}

/** PATCH — replace a workout's exercises + sets (and update kind/rpe/notes). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

  // 1. Update top-level fields on the workout
  const { error: wErr } = await supabase
    .from("workouts")
    .update({
      kind: w.kind ?? null,
      started_at: w.started_at,
      ended_at: w.ended_at ?? null,
      rpe: w.rpe ?? null,
      notes: w.notes ?? null,
    })
    .eq("id", id);
  if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 });

  // 2. Delete existing workout_exercises (CASCADE deletes their sets)
  const { error: delErr } = await supabase.from("workout_exercises").delete().eq("workout_id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  // 3. Re-insert exercises + sets
  for (const [idx, ex] of w.exercises.entries()) {
    const { data: we, error: weErr } = await supabase
      .from("workout_exercises")
      .insert({ workout_id: id, exercise_id: ex.exercise_id, order_idx: idx })
      .select("id")
      .single();
    if (weErr || !we) {
      console.error("we insert (edit)", weErr);
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
    if (setsErr) console.error("sets insert (edit)", setsErr);
  }

  return NextResponse.json({ workout_id: id });
}

/** DELETE — remove a workout entirely. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
