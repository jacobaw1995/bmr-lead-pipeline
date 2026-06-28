import { createClient } from "@/lib/supabase/server";
import type { Lead, LeadAppointment } from "@/types/database";
import {
  buildLeadCoachItems,
  buildPoolItem,
  buildRuleContext,
  buildAppointmentCoachItems,
  dedupeCoachCalls,
  filterHiddenItems,
  parseTodayAppointments,
} from "./rules";
import type { DailyBrief } from "./types";
import { startOfDay } from "./utils";

async function getHiddenItemKeys(
  userId: string,
  now: Date
): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brief_item_overrides")
    .select("item_key")
    .eq("user_id", userId)
    .gt("hidden_until", now.toISOString());

  return new Set((data ?? []).map((r) => r.item_key as string));
}

export async function getDailyBrief(
  userId: string,
  userName: string
): Promise<DailyBrief> {
  const supabase = await createClient();
  const ctx = buildRuleContext();
  const startToday = startOfDay(ctx.now);
  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);

  const [appointmentsResult, myLeadsResult, poolResult, hiddenKeys] =
    await Promise.all([
      supabase
        .from("lead_appointments")
        .select(
          "id, lead_id, appointment_type, scheduled_at, leads!inner(id, name, phone, street_address, city, state, zip, address)"
        )
        .eq("owner_id", userId)
        .eq("status", "scheduled")
        .gte("scheduled_at", startToday.toISOString())
        .lt("scheduled_at", endToday.toISOString())
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("leads")
        .select("*")
        .eq("owner_id", userId)
        .eq("status", "active"),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .eq("stage", "lead_captured")
        .is("owner_id", null),
      getHiddenItemKeys(userId, ctx.now),
    ]);

  const myLeads = (myLeadsResult.data ?? []) as Lead[];
  const leadIds = myLeads.map((l) => l.id);

  if (leadIds.length > 0) {
    const { data: leadAppointments } = await supabase
      .from("lead_appointments")
      .select("*")
      .in("lead_id", leadIds)
      .eq("status", "scheduled");

    for (const apt of leadAppointments ?? []) {
      const row = apt as LeadAppointment;
      const list = ctx.scheduledByLead.get(row.lead_id) ?? [];
      list.push(row);
      ctx.scheduledByLead.set(row.lead_id, list);
    }
  }

  const todayAppointments = appointmentsResult.error
    ? []
    : parseTodayAppointments(appointmentsResult.data ?? [], ctx);

  const rawCoachCalls = [
    ...buildAppointmentCoachItems(todayAppointments),
    ...myLeads.flatMap((lead) => buildLeadCoachItems(lead, ctx)),
    ...(buildPoolItem(poolResult.count ?? 0)
      ? [buildPoolItem(poolResult.count ?? 0)!]
      : []),
  ];

  const coachCalls = filterHiddenItems(
    dedupeCoachCalls(rawCoachCalls),
    hiddenKeys
  );

  return {
    greetingName: userName,
    todayAppointments,
    coachCalls,
    actionCount: coachCalls.length,
    poolCount: poolResult.count ?? 0,
    appointmentsTodayCount: todayAppointments.length,
    isAllClear:
      todayAppointments.length === 0 && coachCalls.length === 0,
  };
}