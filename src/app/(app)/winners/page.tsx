import { redirect } from "next/navigation";
import { ClosedLeadsBoard } from "@/components/leads/ClosedLeadsBoard";
import { getClosedWonLeads } from "@/lib/leads/queries";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function WinnersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  const leads = await getClosedWonLeads();

  return (
    <div className="px-4 py-8 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-field-gold/20 border-2 border-field-gold/40 mb-4">
            <span className="text-4xl">🏆</span>
          </div>
          <h1 className="text-2xl font-bold text-field-cream">
            Winner&apos;s Circle
          </h1>
          <p className="text-field-cream/50 mt-2 max-w-lg mx-auto">
            Every closed-won deal, all time. The scoreboard that never forgets a
            win.
          </p>
        </div>

        <ClosedLeadsBoard
          leads={leads}
          currentUserId={user.id}
          currentUserRole={profile?.role ?? "salesman"}
          variant="won"
          emptyTitle="No wins yet"
          emptyDescription="Close your first deal from The Field and it'll land here permanently."
        />
      </div>
    </div>
  );
}