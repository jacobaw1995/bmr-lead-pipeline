"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ThemePreference } from "@/types/database";

export async function updateThemePreference(
  theme: ThemePreference
): Promise<{ success: true } | { success: false; error: string }> {
  if (theme !== "light" && theme !== "dark") {
    return { success: false, error: "Invalid theme." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ theme_preference: theme })
    .eq("id", user.id);

  if (error) {
    const hint = error.message.includes("theme_preference")
      ? "Run supabase/phase13_sources_theme.sql in Supabase."
      : error.message;
    return { success: false, error: hint };
  }

  revalidatePath("/", "layout");
  return { success: true };
}