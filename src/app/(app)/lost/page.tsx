import { redirect } from "next/navigation";
import { ClosedLeadsBoard } from "@/components/leads/ClosedLeadsBoard";
import {
  fetchLeadNoteSearchIndex,
  getClosedLostLeads,
} from "@/lib/leads/queries";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LostPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  const leads = await getClosedLostLeads();
  const noteSearchIndex = await fetchLeadNoteSearchIndex(
    leads.map((lead) => lead.id)
  );

  return (
    <div className="px-4 py-8 min-h-full bg-gradient-to-b from-field-turf to-field-turf-dark/80">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-field-sage/15 border-2 border-field-sage/35 mb-4">
            <span className="text-4xl">📋</span>
          </div>
          <h1 className="text-2xl font-bold text-field-cream">Lost Zone</h1>
          <p className="text-field-sage/90 mt-2 max-w-lg mx-auto">
            Coaching data, not a graveyard. Every lost deal teaches something —
            patterns here make the team sharper.
          </p>
        </div>

        <ClosedLeadsBoard
          leads={leads}
          noteSearchIndex={noteSearchIndex}
          currentUserId={user.id}
          currentUserRole={profile?.role ?? "salesman"}
          variant="lost"
          emptyTitle="No lost deals yet"
          emptyDescription="When a lead doesn't close, mark it lost with a coaching note. It stays here for the team to learn from."
        />
      </div>
    </div>
  );
}