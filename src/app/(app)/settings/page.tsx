import { redirect } from "next/navigation";
import { ThemeSettings } from "@/components/settings/ThemeSettings";
import { getCurrentProfile } from "@/lib/supabase/profile";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const theme = profile.theme_preference ?? "dark";

  return (
    <div className="px-4 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        <header>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">⚙️</span>
            <h1 className="text-2xl font-bold text-field-cream">Settings</h1>
          </div>
          <p className="text-sm text-field-cream/50">
            Personal preferences for {profile.full_name}
          </p>
        </header>

        <ThemeSettings current={theme} />
      </div>
    </div>
  );
}