import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  display_name: string | null;
  email: string | null;
  dob: string | null;
  sex: "male" | "female" | "other" | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal: string | null;
  activity_level: string | null;
  injuries: string | null;
  created_at: string;
  updated_at: string;
};

export async function getCurrentUserAndProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  return { user, profile };
}

/** A profile is "complete" once the user has picked a goal. */
export function isProfileComplete(profile: Profile | null): boolean {
  return Boolean(profile?.goal);
}
