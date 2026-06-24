import { redirect } from "next/navigation";
import { ImportLeadsCsv } from "@/components/manager/ImportLeadsCsv";
import { TeamOverview } from "@/components/manager/TeamOverview";
import { TeamScheduleToday } from "@/components/manager/TeamScheduleToday";
import { getTeamOverview } from "@/lib/manager/queries";
import { getTeamAppointmentsToday } from "@/lib/manager/schedule";
import { getCurrentProfile } from "@/lib/supabase/profile";

export const dynamic = "force-dynamic";

export default async function ManagerPage() {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");

  if (profile.role !== "manager") {
    redirect("/locker");
  }

  const [overview, teamSchedule] = await Promise.all([
    getTeamOverview(),
    getTeamAppointmentsToday(),
  ]);

  return (
    <div className="px-4 py-6 sm:py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl sm:text-3xl">👥</span>
            <h1 className="text-xl sm:text-2xl font-bold text-field-cream">
              Team View
            </h1>
          </div>
          <p className="text-field-cream/50 text-sm max-w-xl">
            Manager-only pipeline health. Team-wide numbers live here — the only
            place rankings appear in the app.
          </p>
        </div>

        <div className="space-y-8">
          <ImportLeadsCsv />
          <TeamScheduleToday appointments={teamSchedule} />
          <TeamOverview data={overview} />
        </div>
      </div>
    </div>
  );
}