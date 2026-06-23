import type { Profile } from "@/types/database";
import { createClient } from "./server";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  let data = profile;

  if (error || !data) {
    await supabase.rpc("ensure_profile");
    const retry = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    data = retry.data;
    if (!data) return null;
  }

  return data as Profile;
}