import { createClient } from "@/lib/supabase/server";

export type MealLog = {
  id: string;
  user_id: string;
  eaten_at: string;
  name: string;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  source: string;
};

export async function getMealsForDay(date: string): Promise<MealLog[]> {
  const supabase = await createClient();
  const start = `${date}T00:00:00.000Z`;
  const end = `${date}T23:59:59.999Z`;
  const { data } = await supabase
    .from("meal_logs")
    .select("*")
    .gte("eaten_at", start)
    .lte("eaten_at", end)
    .order("eaten_at", { ascending: true });
  return data ?? [];
}

export function totalMacros(meals: MealLog[]) {
  return meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + (m.kcal ?? 0),
      protein_g: acc.protein_g + (m.protein_g ?? 0),
      carbs_g: acc.carbs_g + (m.carbs_g ?? 0),
      fat_g: acc.fat_g + (m.fat_g ?? 0),
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

/** Mifflin-St Jeor BMR + activity multiplier → daily calorie target by goal. */
export function targetMacros(profile: {
  sex: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  dob: string | null;
  activity_level: string | null;
  goal: string | null;
}): { kcal: number; protein_g: number; carbs_g: number; fat_g: number } | null {
  if (!profile.height_cm || !profile.weight_kg || !profile.dob || !profile.sex) return null;
  const age = ageFromDob(profile.dob);
  if (age == null) return null;

  // BMR (Mifflin-St Jeor)
  let bmr = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * age;
  bmr += profile.sex === "male" ? 5 : profile.sex === "female" ? -161 : -78;

  const multipliers: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
  };
  const tdee = bmr * (multipliers[profile.activity_level ?? "moderate"] ?? 1.55);

  let kcal = tdee;
  if (profile.goal === "fat_loss") kcal = tdee - 400;
  else if (profile.goal === "lean_muscle") kcal = tdee + 250;

  // Protein 1.8 g/kg, fat 25% of kcal, rest carbs
  const protein_g = Math.round(profile.weight_kg * 1.8);
  const fat_g = Math.round((kcal * 0.25) / 9);
  const carbs_g = Math.max(0, Math.round((kcal - protein_g * 4 - fat_g * 9) / 4));

  return { kcal: Math.round(kcal), protein_g, carbs_g, fat_g };
}

function ageFromDob(dob: string): number | null {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}
