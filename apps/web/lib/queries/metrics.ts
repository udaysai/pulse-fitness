import { createClient } from "@/lib/supabase/server";

export type DailyMetricRow = {
  user_id: string;
  date: string;
  steps: number | null;
  active_kcal: number | null;
  resting_hr: number | null;
  hrv_ms: number | null;
  sleep_minutes: number | null;
  vo2_max: number | null;
  weight_kg: number | null;
  body_fat_pct: number | null;
};

export async function getRecentMetrics(days = 14): Promise<DailyMetricRow[]> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const isoDate = since.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("daily_metrics")
    .select("*")
    .gte("date", isoDate)
    .order("date", { ascending: false });
  if (error) {
    console.error("getRecentMetrics", error);
    return [];
  }
  return data ?? [];
}

export function averageNonNull(rows: DailyMetricRow[], key: keyof DailyMetricRow): number | null {
  const nums = rows.map((r) => r[key]).filter((v): v is number => typeof v === "number");
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function trend(rows: DailyMetricRow[], key: keyof DailyMetricRow): number {
  // % change of last-7 average vs prior-7 average
  if (rows.length < 4) return 0;
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const half = Math.floor(sorted.length / 2);
  const recent = averageNonNull(sorted.slice(half), key);
  const prior = averageNonNull(sorted.slice(0, half), key);
  if (recent === null || prior === null || prior === 0) return 0;
  return (recent - prior) / prior;
}
