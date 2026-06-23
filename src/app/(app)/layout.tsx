import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { AppNav } from "@/components/layout/AppNav";
import { ScoreboardStrip } from "@/components/layout/ScoreboardStrip";
import { getPersonalStats } from "@/lib/stats/queries";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profile, stats] = await Promise.all([
    getCurrentProfile(),
    getPersonalStats(),
  ]);

  return (
    <div className="min-h-screen bg-field-turf flex flex-col">
      <AppNav profile={profile} />
      {stats && <ScoreboardStrip stats={stats} />}
      <main className="flex-1">{children}</main>
    </div>
  );
}