import { redirect } from "next/navigation";
import { BriefStats } from "@/components/locker/BriefStats";
import { CoachCalls } from "@/components/locker/CoachCalls";
import { GameTimeButton } from "@/components/locker/GameTimeButton";
import { TodaySchedule } from "@/components/locker/TodaySchedule";
import { getDailyBrief } from "@/lib/brief/queries";
import { formatBriefDate } from "@/lib/brief/utils";
import { getPersonalStats } from "@/lib/stats/queries";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LockerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  let brief;
  let stats;
  try {
    [brief, stats] = await Promise.all([
      getDailyBrief(user.id, profile?.full_name ?? "Rep"),
      getPersonalStats(),
    ]);
  } catch {
    brief = {
      greetingName: profile?.full_name ?? "Rep",
      todayAppointments: [],
      coachCalls: [],
      actionCount: 0,
      poolCount: 0,
      appointmentsTodayCount: 0,
      isAllClear: true,
    };
    stats = null;
  }

  if (!stats) redirect("/login");

  return (
    <div className="min-h-full flex flex-col">
      <div className="flex-1 px-4 py-6">
        <div className="max-w-lg mx-auto space-y-6">
          <header>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl">🚪</span>
              <div>
                <h1 className="text-2xl font-bold text-field-cream">
                  Locker Room
                </h1>
                <p className="text-xs text-field-cream/45">{formatBriefDate()}</p>
              </div>
            </div>
            <p className="text-sm text-field-cream/55 mt-3 leading-relaxed">
              Morning brief, {brief.greetingName.split(" ")[0]}. Run through
              today&apos;s plan, then hit the field.
            </p>
          </header>

          <BriefStats
            stats={stats}
            appointmentsToday={brief.appointmentsTodayCount}
            actionCount={brief.actionCount}
          />

          {brief.isAllClear && (
            <div className="rounded-xl border border-field-gold/25 bg-field-gold/10 px-5 py-4 text-center">
              <p className="text-sm font-semibold text-field-gold">
                Clear day on the calendar
              </p>
              <p className="text-xs text-field-cream/50 mt-1">
                No visits scheduled and no coach prompts. Go hunt — or hit the
                field and work your pipeline.
              </p>
            </div>
          )}

          <TodaySchedule appointments={brief.todayAppointments} />

          <CoachCalls items={brief.coachCalls} />
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full px-4">
        <GameTimeButton
          actionCount={brief.actionCount}
          isAllClear={brief.isAllClear}
        />
      </div>
    </div>
  );
}