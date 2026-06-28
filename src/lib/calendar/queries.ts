import { formatFullAddress } from "@/lib/leads/address";
import {
  SITE_VISIT_APPOINTMENT_TYPES,
  isAppointmentOverdue,
} from "@/lib/leads/appointments";
import { formatLeadDisplayName, getPrimaryPhone } from "@/lib/leads/profile";
import { createClient } from "@/lib/supabase/server";
import type { Lead } from "@/types/database";
import type { CalendarSiteVisit } from "./types";
import { endOfMonth, startOfMonth } from "./utils";

export async function getSiteVisitCalendarAppointments(
  year: number,
  month: number
): Promise<CalendarSiteVisit[]> {
  const supabase = await createClient();
  const rangeStart = startOfMonth(year, month);
  const rangeEnd = endOfMonth(year, month);
  const now = new Date();

  const { data, error } = await supabase
    .from("lead_appointments")
    .select(
      `id, lead_id, owner_id, appointment_type, scheduled_at, duration_minutes, status, notes,
       owner:profiles!lead_appointments_owner_id_fkey(id, full_name),
       leads!inner(
         id, name, first_name, last_name, company_name,
         phone, cell_phone, secondary_phone,
         street_address, city, state, zip, address,
         service_street_address, service_city, service_state, service_zip,
         billing_street_address, billing_city, billing_state, billing_zip
       )`
    )
    .in("appointment_type", SITE_VISIT_APPOINTMENT_TYPES)
    .gte("scheduled_at", rangeStart.toISOString())
    .lt("scheduled_at", rangeEnd.toISOString())
    .order("scheduled_at", { ascending: true });

  if (error || !data) return [];

  return data.flatMap((row) => {
    const leadRaw = row.leads;
    const lead = (Array.isArray(leadRaw) ? leadRaw[0] : leadRaw) as Lead | null;
    if (!lead) return [];

    const ownerRaw = row.owner;
    const owner = (Array.isArray(ownerRaw) ? ownerRaw[0] : ownerRaw) as {
      id: string;
      full_name: string;
    } | null;

    const scheduledAt = row.scheduled_at as string;
    const status = row.status as CalendarSiteVisit["status"];

    return [
      {
        id: row.id as string,
        leadId: row.lead_id as string,
        leadName: formatLeadDisplayName(lead),
        location: formatFullAddress(lead),
        phone: getPrimaryPhone(lead),
        repId: row.owner_id as string,
        repName: owner?.full_name ?? "Unknown",
        appointmentType: row.appointment_type as CalendarSiteVisit["appointmentType"],
        scheduledAt,
        durationMinutes: row.duration_minutes as number,
        status,
        notes: (row.notes as string | null) ?? null,
        isOverdue:
          status === "scheduled" && isAppointmentOverdue(scheduledAt, now),
      },
    ];
  });
}