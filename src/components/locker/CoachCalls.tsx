"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { dismissBriefItem, snoozeBriefItem } from "@/lib/brief/actions";
import type { BriefItem } from "@/lib/brief/types";
import { PriorityBadge } from "./PriorityBadge";

const KIND_ICONS: Record<BriefItem["kind"], string> = {
  appointment_soon: "⏰",
  appointment_today: "📅",
  send_proposal: "📄",
  follow_up_gentle: "📞",
  follow_up_urgent: "🔔",
  schedule_survey: "🏠",
  claim_pool: "🎯",
  stale_lead: "💤",
  new_lead_contact: "👋",
  appointment_overdue: "⚠",
};

interface CoachCallsProps {
  items: BriefItem[];
}

export function CoachCalls({ items: initialItems }: CoachCallsProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  async function handleSnooze(itemKey: string) {
    setError(null);
    setLoadingKey(itemKey);
    const result = await snoozeBriefItem(itemKey);
    if (!result.success) {
      setError(result.error);
      setLoadingKey(null);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== itemKey));
    setLoadingKey(null);
    router.refresh();
  }

  async function handleDismiss(itemKey: string) {
    setError(null);
    setLoadingKey(itemKey);
    const result = await dismissBriefItem(itemKey);
    if (!result.success) {
      setError(result.error);
      setLoadingKey(null);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== itemKey));
    setLoadingKey(null);
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-field-line/20 bg-field-turf/10 p-5 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none field-pattern"
          aria-hidden
        />
        <div className="relative text-center py-2">
          <span className="text-3xl block mb-2" aria-hidden>
            ✓
          </span>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-field-gold mb-2">
            Coach&apos;s Calls
          </h2>
          <p className="text-sm text-field-cream/50">
            All clear. You&apos;re caught up — time to execute on the field.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-field-line/20 bg-field-turf/10 p-5 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none field-pattern"
        aria-hidden
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-field-gold">
            Coach&apos;s Calls
          </h2>
          <span className="text-xs font-mono text-field-cream/40">
            {items.length} action{items.length === 1 ? "" : "s"}
          </span>
        </div>

        {error && (
          <p className="text-xs text-red-400 mb-3">{error}</p>
        )}

        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-field-line/20 bg-field-dark/35 overflow-hidden"
            >
              <Link
                href={item.href}
                className="flex items-start gap-3 p-3 hover:bg-field-dark/50 transition group"
              >
                <span className="text-lg shrink-0 mt-0.5" aria-hidden>
                  {KIND_ICONS[item.kind]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-field-cream leading-snug">
                    {item.message}
                  </p>
                  <span className="text-xs font-medium text-field-gold/80 group-hover:text-field-gold mt-1 inline-block">
                    {item.actionLabel} →
                  </span>
                </div>
                <PriorityBadge priority={item.priority} />
              </Link>
              <div className="flex border-t border-field-line/10">
                <button
                  type="button"
                  disabled={loadingKey === item.id}
                  onClick={() => handleSnooze(item.id)}
                  className="flex-1 py-2 text-[10px] font-medium uppercase tracking-wide text-field-cream/45 hover:text-field-cream hover:bg-field-turf/15 transition disabled:opacity-50"
                >
                  Snooze 24h
                </button>
                <button
                  type="button"
                  disabled={loadingKey === item.id}
                  onClick={() => handleDismiss(item.id)}
                  className="flex-1 py-2 text-[10px] font-medium uppercase tracking-wide text-field-cream/45 hover:text-field-cream hover:bg-field-turf/15 transition border-l border-field-line/10 disabled:opacity-50"
                >
                  Done today
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}