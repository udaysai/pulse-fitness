import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PatchSchema = z.object({
  action: z.enum(["swap", "remove", "add", "update_sets", "reorder"]),
  exercise_index: z.number().int().min(0).max(30).optional(),
  new_exercise_id: z.string().optional(),
  sets: z.number().int().min(1).max(20).optional(),
  reps: z.string().max(20).optional(),
  rest_seconds: z.number().int().min(0).max(900).optional(),
  target_rpe: z.number().int().min(1).max(10).optional(),
  // For 'add': the exercise to insert
  add_exercise: z
    .object({
      exercise_id: z.string(),
      sets: z.number().int().min(1).max(20),
      reps: z.string(),
      rest_seconds: z.number().int().min(0).max(900),
      target_rpe: z.number().int().min(1).max(10),
    })
    .optional(),
  // For 'reorder': new order of exercise indexes
  new_order: z.array(z.number().int().min(0).max(30)).optional(),
});

type DayExercise = {
  exercise_id: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  target_rpe: number;
  why?: string;
  form_cues?: string[];
  weight_guidance?: string;
  variants?: string[];
  name?: string;
  primary_muscle?: string;
  demo_gif_url?: string;
};

type DayPlan = {
  date: string;
  day_name: string;
  type: string;
  focus: string;
  why_today: string;
  duration_minutes: number;
  warmup: unknown;
  exercises: DayExercise[];
  cardio: unknown;
  cooldown: unknown;
  notes: string;
};

export async function PATCH(req: Request, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  // Load existing daily_plan
  const { data: existing } = await supabase
    .from("daily_plans")
    .select("id, plan")
    .eq("date", date)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "plan_not_found" }, { status: 404 });

  const plan = existing.plan as DayPlan;
  const exercises = Array.isArray(plan.exercises) ? [...plan.exercises] : [];

  switch (parsed.data.action) {
    case "swap": {
      const i = parsed.data.exercise_index;
      const newId = parsed.data.new_exercise_id;
      if (i === undefined || !newId || !exercises[i]) return NextResponse.json({ error: "bad_index" }, { status: 400 });
      // Pull metadata for the new exercise
      const { data: row } = await supabase
        .from("exercises")
        .select("id, name, primary_muscle, demo_gif_url")
        .eq("id", newId)
        .single();
      if (!row) return NextResponse.json({ error: "exercise_not_found" }, { status: 404 });
      exercises[i] = {
        ...exercises[i],
        exercise_id: row.id,
        name: row.name,
        primary_muscle: row.primary_muscle,
        demo_gif_url: row.demo_gif_url ?? undefined,
        // Clear curated metadata since they're new exercises now
        why: undefined,
        form_cues: undefined,
        weight_guidance: undefined,
        variants: undefined,
      };
      break;
    }
    case "remove": {
      const i = parsed.data.exercise_index;
      if (i === undefined || !exercises[i]) return NextResponse.json({ error: "bad_index" }, { status: 400 });
      exercises.splice(i, 1);
      break;
    }
    case "add": {
      const a = parsed.data.add_exercise;
      if (!a) return NextResponse.json({ error: "missing_add" }, { status: 400 });
      const { data: row } = await supabase
        .from("exercises")
        .select("id, name, primary_muscle, demo_gif_url")
        .eq("id", a.exercise_id)
        .single();
      if (!row) return NextResponse.json({ error: "exercise_not_found" }, { status: 404 });
      exercises.push({
        ...a,
        name: row.name,
        primary_muscle: row.primary_muscle,
        demo_gif_url: row.demo_gif_url ?? undefined,
      });
      break;
    }
    case "update_sets": {
      const i = parsed.data.exercise_index;
      if (i === undefined || !exercises[i]) return NextResponse.json({ error: "bad_index" }, { status: 400 });
      if (parsed.data.sets !== undefined) exercises[i].sets = parsed.data.sets;
      if (parsed.data.reps !== undefined) exercises[i].reps = parsed.data.reps;
      if (parsed.data.rest_seconds !== undefined) exercises[i].rest_seconds = parsed.data.rest_seconds;
      if (parsed.data.target_rpe !== undefined) exercises[i].target_rpe = parsed.data.target_rpe;
      break;
    }
    case "reorder": {
      const order = parsed.data.new_order;
      if (!order || order.length !== exercises.length) return NextResponse.json({ error: "bad_order" }, { status: 400 });
      const reordered = order.map((idx) => exercises[idx]).filter(Boolean);
      if (reordered.length !== exercises.length) return NextResponse.json({ error: "bad_order" }, { status: 400 });
      exercises.length = 0;
      exercises.push(...reordered);
      break;
    }
  }

  const updated: DayPlan = { ...plan, exercises };
  const { error } = await supabase
    .from("daily_plans")
    .update({ plan: updated })
    .eq("id", existing.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, plan: updated });
}
