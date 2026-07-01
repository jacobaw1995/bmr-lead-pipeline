import { formatActivityDescription } from "@/lib/leads/activity";
import { formatTimestamp } from "@/lib/leads/format";
import type { ActivityWithActor } from "@/lib/leads/types";

interface LeadActivityTrailProps {
  activity: ActivityWithActor[];
  ownerNames?: Record<string, string>;
  loading?: boolean;
}

export function LeadActivityTrail({
  activity,
  ownerNames,
  loading,
}: LeadActivityTrailProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-field-turf/10 animate-pulse" />
        ))}
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <p className="text-sm text-field-cream/40 text-center py-4">
        No activity recorded yet
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {activity.map((entry) => (
        <li
          key={entry.id}
          className="rounded-lg border border-field-line/15 bg-field-turf/10 px-3 py-2.5"
        >
          <p className="text-sm text-field-cream/80 leading-snug">
            {formatActivityDescription(entry, ownerNames)}
          </p>
          <p className="text-[11px] text-field-cream/35 mt-1">
            {formatTimestamp(entry.created_at)}
          </p>
        </li>
      ))}
    </ol>
  );
}