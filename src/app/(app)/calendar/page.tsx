import { redirect } from "next/navigation";
import { SiteVisitCalendar } from "@/components/calendar/SiteVisitCalendar";
import { getSiteVisitCalendarAppointments } from "@/lib/calendar/queries";
import type { CalendarSiteVisit } from "@/lib/calendar/types";
import { parseCalendarMonth } from "@/lib/calendar/utils";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface CalendarPageProps {
  searchParams: { month?: string };
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  const { year, month } = parseCalendarMonth(searchParams.month);

  let appointments: CalendarSiteVisit[] = [];
  try {
    appointments = await getSiteVisitCalendarAppointments(year, month);
  } catch {
    // Degrade gracefully — empty calendar beats a server error page
  }

  return (
    <div className="px-4 py-8 min-h-full">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">📅</span>
            <div>
              <h1 className="text-2xl font-bold text-field-cream">
                Site Visit Calendar
              </h1>
              <p className="text-xs text-field-cream/45 mt-0.5">
                Past and upcoming inspections &amp; site surveys
              </p>
            </div>
          </div>
          <p className="text-sm text-field-cream/55 leading-relaxed max-w-2xl">
            Month view of every scheduled site visit — customer, time, location,
            and assigned rep. Tap any visit to open the lead in The Field.
          </p>
        </header>

        <SiteVisitCalendar
          appointments={appointments}
          year={year}
          month={month}
          currentUserId={user.id}
          isManager={profile?.role === "manager"}
        />
      </div>
    </div>
  );
}