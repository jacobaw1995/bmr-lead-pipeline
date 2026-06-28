import { redirect } from "next/navigation";
import { FieldBoard } from "@/components/leads/FieldBoard";
import { getSiteVisitCalendarAppointments } from "@/lib/calendar/queries";
import type { CalendarSiteVisit } from "@/lib/calendar/types";
import { parseCalendarMonth, parseFieldView } from "@/lib/calendar/utils";
import {
  fetchLeadNoteSearchIndex,
  getActivePipelineLeads,
} from "@/lib/leads/queries";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FieldPage({
  searchParams,
}: {
  searchParams: { lead?: string; view?: string; month?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  const fieldView = parseFieldView(searchParams.view);
  const { year, month } = parseCalendarMonth(searchParams.month);

  const leads = await getActivePipelineLeads();
  const noteSearchIndex = await fetchLeadNoteSearchIndex(
    leads.map((lead) => lead.id)
  );

  let calendarAppointments: CalendarSiteVisit[] = [];
  if (fieldView === "calendar") {
    try {
      calendarAppointments = await getSiteVisitCalendarAppointments(year, month);
    } catch {
      // Empty calendar beats a server error page
    }
  }

  return (
    <FieldBoard
      initialLeads={leads}
      initialLeadId={searchParams.lead ?? null}
      noteSearchIndex={noteSearchIndex}
      currentUserId={user.id}
      currentUserRole={profile?.role ?? "salesman"}
      fieldView={fieldView}
      calendarAppointments={calendarAppointments}
      calendarYear={year}
      calendarMonth={month}
    />
  );
}