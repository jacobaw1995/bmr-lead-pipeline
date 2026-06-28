import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { AppNav } from "@/components/layout/AppNav";
import { ScoreboardStrip } from "@/components/layout/ScoreboardStrip";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import type { ThemePreference } from "@/types/database";
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

  const profile = await getCurrentProfile();
  let stats = null;
  try {
    stats = await getPersonalStats();
  } catch {
    stats = null;
  }

  const theme = (profile?.theme_preference ?? "dark") as ThemePreference;

  return (
    <ThemeProvider theme={theme}>
      <div className="min-h-screen bg-field-turf flex flex-col">
        <AppNav profile={profile} />
        {stats && <ScoreboardStrip stats={stats} />}
        <main className="flex-1">{children}</main>
      </div>
    </ThemeProvider>
  );
}