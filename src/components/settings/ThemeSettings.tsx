"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateThemePreference } from "@/lib/profile/actions";
import type { ThemePreference } from "@/types/database";

interface ThemeSettingsProps {
  current: ThemePreference;
}

export function ThemeSettings({ current }: ThemeSettingsProps) {
  const router = useRouter();
  const [theme, setTheme] = useState(current);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function select(next: ThemePreference) {
    if (next === theme) return;
    setError(null);
    setLoading(true);
    setTheme(next);

    const result = await updateThemePreference(next);

    if (!result.success) {
      setError(result.error);
      setTheme(current);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-field-line/20 bg-field-dark/40 p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-field-gold mb-1">
        Appearance
      </h2>
      <p className="text-xs text-field-cream/45 mb-4">
        Saved to your profile — follows you on any device.
      </p>

      {error && (
        <p className="text-xs text-red-400 mb-3">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <ThemeOption
          label="Field (Dark)"
          description="Turf green — default"
          active={theme === "dark"}
          disabled={loading}
          onClick={() => select("dark")}
          previewClass="bg-field-turf border-field-gold/40"
        />
        <ThemeOption
          label="Daylight (Light)"
          description="Bright background for outdoors"
          active={theme === "light"}
          disabled={loading}
          onClick={() => select("light")}
          previewClass="bg-[#e8f0ea] border-[#b8860b]/50"
        />
      </div>
    </section>
  );
}

function ThemeOption({
  label,
  description,
  active,
  disabled,
  onClick,
  previewClass,
}: {
  label: string;
  description: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  previewClass: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition ${
        active
          ? "border-field-gold/50 bg-field-gold/10"
          : "border-field-line/25 hover:border-field-line/40"
      } disabled:opacity-50`}
    >
      <div
        className={`h-8 rounded-md border mb-2 ${previewClass}`}
        aria-hidden
      />
      <p className="text-sm font-medium text-field-cream">{label}</p>
      <p className="text-[10px] text-field-cream/45 mt-0.5">{description}</p>
    </button>
  );
}