"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateMonthlyCloseGoal(
  goal: number | null
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  if (goal !== null && (!Number.isInteger(goal) || goal < 1)) {
    return { success: false, error: "Goal must be a positive whole number." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ monthly_close_goal: goal })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}