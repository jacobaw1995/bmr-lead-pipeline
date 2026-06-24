"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { startOfDay } from "./utils";

function endOfToday(): Date {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + 1);
  return d;
}

async function upsertOverride(
  userId: string,
  itemKey: string,
  hiddenUntil: Date
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("brief_item_overrides").upsert(
    {
      user_id: userId,
      item_key: itemKey,
      hidden_until: hiddenUntil.toISOString(),
    },
    { onConflict: "user_id,item_key" }
  );

  if (error) {
    const hint = error.message.includes("brief_item_overrides")
      ? "Run supabase/phase11_brief_overrides.sql in Supabase."
      : error.message;
    return { success: false, error: hint };
  }

  revalidatePath("/locker");
  return { success: true };
}

export async function snoozeBriefItem(
  itemKey: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const hiddenUntil = new Date();
  hiddenUntil.setHours(hiddenUntil.getHours() + 24);

  return upsertOverride(user.id, itemKey, hiddenUntil);
}

export async function dismissBriefItem(
  itemKey: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  return upsertOverride(user.id, itemKey, endOfToday());
}