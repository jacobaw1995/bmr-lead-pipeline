import { redirect } from "next/navigation";
import { LeadVaultBoard } from "@/components/leads/LeadVaultBoard";
import {
  fetchLeadNoteSearchIndex,
  getAllLeadsForVault,
} from "@/lib/leads/queries";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function VaultPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  const leads = await getAllLeadsForVault();
  const noteSearchIndex = await fetchLeadNoteSearchIndex(
    leads.map((lead) => lead.id)
  );

  return (
    <div className="px-4 py-8 min-h-full">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🗄️</span>
            <div>
              <h1 className="text-2xl font-bold text-field-cream">Lead Vault</h1>
              <p className="text-xs text-field-cream/45 mt-0.5">
                Master record of every lead — active, won, and lost
              </p>
            </div>
          </div>
          <p className="text-sm text-field-cream/55 leading-relaxed max-w-2xl">
            Search across names, notes, square footage, addresses, roof types,
            and more. Open any row to view the full lead command center.
          </p>
        </header>

        <LeadVaultBoard
          leads={leads}
          noteSearchIndex={noteSearchIndex}
          currentUserId={user.id}
          currentUserRole={profile?.role ?? "salesman"}
        />
      </div>
    </div>
  );
}