import { formatFullAddress } from "@/lib/leads/address";
import { formatAppointmentDateTime } from "@/lib/leads/appointments";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentType, Lead } from "@/types/database";
import { startOfDay } from "@/lib/brief/utils";

export interface TeamAppointmentToday {
  id: string;
  leadId: string;
  repName: string;
  leadName: string;
  location: string | null;
  appointmentType: AppointmentType;
  scheduledAt: string;
  formattedTime: string;
}

export async function getTeamAppointmentsToday(): Promise<
  TeamAppointmentToday[]
> {
  const supabase = await createClient();
  const startToday = startOfDay(new Date());
  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);

  const { data, error } = await supabase
    .from("lead_appointments")
    .select(
      "id, lead_id, appointment_type, scheduled_at, owner:profiles!lead_appointments_owner_id_fkey(full_name), leads!inner(id, name, street_address, city, state, zip, address)"
    )
    .eq("status", "scheduled")
    .gte("scheduled_at", startToday.toISOString())
    .lt("scheduled_at", endToday.toISOString())
    .order("scheduled_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => {
    const leadRaw = row.leads;
    const lead = (Array.isArray(leadRaw) ? leadRaw[0] : leadRaw) as Pick<
      Lead,
      "name" | "street_address" | "city" | "state" | "zip" | "address"
    >;
    const ownerRaw = row.owner;
    const owner = (Array.isArray(ownerRaw) ? ownerRaw[0] : ownerRaw) as {
      full_name: string;
    } | null;
    const scheduledAt = row.scheduled_at as string;

    const leadId = (row.lead_id as string) ?? (lead as { id?: string }).id;

    return {
      id: row.id as string,
      leadId,
      repName: owner?.full_name ?? "Unknown",
      leadName: lead.name,
      location: formatFullAddress(lead),
      appointmentType: row.appointment_type as AppointmentType,
      scheduledAt,
      formattedTime: formatAppointmentDateTime(scheduledAt),
    };
  });
}