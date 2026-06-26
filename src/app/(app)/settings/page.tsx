import { redirect } from "next/navigation";
import { ImportHistory } from "@/components/manager/ImportHistory";
import { ImportLeadsCsv } from "@/components/manager/ImportLeadsCsv";
import { ThemeSettings } from "@/components/settings/ThemeSettings";
import {
  getImportBatches,
  getOrphanCsvImportCount,
} from "@/lib/leads/imports";
import { getCurrentProfile } from "@/lib/supabase/profile";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const theme = profile.theme_preference ?? "dark";
  const isManager = profile.role === "manager";

  const [importBatches, orphanCount] = isManager
    ? await Promise.all([getImportBatches(), getOrphanCsvImportCount()])
    : [[], 0];

  return (
    <div className="px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
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

        {isManager && (
          <section className="space-y-6 pt-2 border-t border-field-line/15">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-field-gold">
                Lead imports
              </h2>
              <p className="text-xs text-field-cream/45 mt-1 leading-relaxed">
                Upload backlog spreadsheets and manage import history in one
                place.
              </p>
            </div>
            <ImportLeadsCsv />
            <ImportHistory batches={importBatches} orphanCount={orphanCount} />
          </section>
        )}
      </div>
    </div>
  );
}