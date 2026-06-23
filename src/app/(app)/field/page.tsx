import { redirect } from "next/navigation";
import { FieldBoard } from "@/components/leads/FieldBoard";
import { getActivePipelineLeads } from "@/lib/leads/queries";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FieldPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  const leads = await getActivePipelineLeads();

  return (
    <FieldBoard
      initialLeads={leads}
      currentUserId={user.id}
      currentUserRole={profile?.role ?? "salesman"}
    />
  );
}