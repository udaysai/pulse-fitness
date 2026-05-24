import { z } from "zod";

// =============================================================================
// Shared Zod schemas — validate every API boundary
// =============================================================================

export const GoalEnum = z.enum(["fat_loss", "lean_muscle", "strength", "maintenance", "energy", "wellness"]);
export const SexEnum = z.enum(["male", "female", "other"]);
export const ActivityLevelEnum = z.enum(["sedentary", "light", "moderate", "active", "very_active"]);

export const ProfileUpsertSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  sex: SexEnum.optional().nullable(),
  height_cm: z.coerce.number().min(50).max(300).optional().nullable(),
  weight_kg: z.coerce.number().min(20).max(500).optional().nullable(),
  goal: GoalEnum.optional().nullable(),
  activity_level: ActivityLevelEnum.optional().nullable(),
  injuries: z.string().max(2000).optional().nullable(),
});
export type ProfileUpsert = z.infer<typeof ProfileUpsertSchema>;

export const DailyMetricSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  steps: z.number().int().min(0).max(200000).nullable().optional(),
  active_kcal: z.number().int().min(0).max(20000).nullable().optional(),
  resting_hr: z.number().int().min(20).max(200).nullable().optional(),
  hrv_ms: z.number().min(0).max(500).nullable().optional(),
  sleep_minutes: z.number().int().min(0).max(1440).nullable().optional(),
  vo2_max: z.number().min(0).max(100).nullable().optional(),
  weight_kg: z.number().min(20).max(500).nullable().optional(),
  body_fat_pct: z.number().min(1).max(70).nullable().optional(),
});
export type DailyMetric = z.infer<typeof DailyMetricSchema>;

export const HealthImportSchema = z.object({
  file_hash: z.string().min(8).max(128),
  records_imported: z.number().int().min(0),
  date_range_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_range_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  metrics: z.array(DailyMetricSchema).max(50000),
});
export type HealthImport = z.infer<typeof HealthImportSchema>;

export const WorkoutCreateSchema = z.object({
  kind: z.string().max(50).optional(),
  started_at: z.string().datetime(),
  ended_at: z.string().datetime().optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(2000).optional(),
  exercises: z.array(
    z.object({
      exercise_id: z.string(),
      sets: z.array(
        z.object({
          reps: z.number().int().min(0).max(200).optional(),
          weight_kg: z.number().min(0).max(1000).optional(),
          rir: z.number().int().min(0).max(10).optional(),
        }),
      ).min(1).max(30),
    }),
  ).min(1).max(30),
});
export type WorkoutCreate = z.infer<typeof WorkoutCreateSchema>;

export const MealLogSchema = z.object({
  eaten_at: z.string().datetime(),
  name: z.string().min(1).max(200),
  kcal: z.number().min(0).max(10000).optional().nullable(),
  protein_g: z.number().min(0).max(500).optional().nullable(),
  carbs_g: z.number().min(0).max(1000).optional().nullable(),
  fat_g: z.number().min(0).max(500).optional().nullable(),
});
export type MealLogInput = z.infer<typeof MealLogSchema>;
