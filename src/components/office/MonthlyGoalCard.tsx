"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMonthlyCloseGoal } from "@/lib/stats/actions";
import type { PersonalStats } from "@/lib/stats/types";

interface MonthlyGoalCardProps {
  stats: PersonalStats;
}

export function MonthlyGoalCard({ stats }: MonthlyGoalCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [goalInput, setGoalInput] = useState(
    stats.monthlyCloseGoal?.toString() ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const goal = stats.monthlyCloseGoal;
  const progress =
    goal && goal > 0
      ? Math.min(100, Math.round((stats.closesThisMonth / goal) * 100))
      : null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const parsed = goalInput.trim() === "" ? null : parseInt(goalInput, 10);
    const result = await updateMonthlyCloseGoal(parsed);

    if (!result.success) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setEditing(false);
    setSaving(false);
    router.refresh();
  }

  async function handleClear() {
    setSaving(true);
    const result = await updateMonthlyCloseGoal(null);
    if (!result.success) {
      setError(result.error);
      setSaving(false);
      return;
    }
    setGoalInput("");
    setEditing(false);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-field-gold/30 bg-field-dark/60 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-field-gold mb-1">
        Monthly Close Goal
      </h2>
      <p className="text-xs text-field-cream/45 mb-5">
        Your target — compared only against your own performance
      </p>

      {error && (
        <p className="text-xs text-red-400 mb-3">{error}</p>
      )}

      {!editing && goal ? (
        <div>
          <div className="flex items-end justify-between mb-3">
            <div>
              <span className="text-4xl font-bold text-field-cream">
                {stats.closesThisMonth}
              </span>
              <span className="text-lg text-field-cream/50 ml-1">
                / {goal}
              </span>
            </div>
            <span className="text-2xl font-bold text-field-gold">
              {progress}%
            </span>
          </div>

          <div className="h-3 rounded-full bg-field-turf/30 overflow-hidden">
            <div
              className="h-full rounded-full bg-field-gold transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-xs text-field-cream/40 mt-3">
            {stats.closesThisMonth >= goal
              ? "Goal reached — keep pushing!"
              : `${goal - stats.closesThisMonth} more to hit your goal`}
          </p>

          <button
            onClick={() => {
              setGoalInput(goal.toString());
              setEditing(true);
            }}
            className="mt-4 text-sm text-field-gold/80 hover:text-field-gold transition"
          >
            Edit goal
          </button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label
              htmlFor="monthly-goal"
              className="block text-xs font-medium text-field-cream/70 mb-1"
            >
              Closes this month
            </label>
            <input
              id="monthly-goal"
              type="number"
              min={1}
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="e.g. 10"
              className="w-full rounded-lg border border-field-line/30 bg-field-turf/10 px-3 py-2 text-sm text-field-cream placeholder:text-field-cream/30 focus:outline-none focus:ring-2 focus:ring-field-gold/40"
            />
          </div>
          <div className="flex gap-2">
            {goal && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex-1 rounded-lg border border-field-line/30 px-4 py-2 text-sm text-field-cream/70 hover:bg-field-turf/20 transition"
              >
                Cancel
              </button>
            )}
            {goal && (
              <button
                type="button"
                onClick={handleClear}
                disabled={saving}
                className="rounded-lg border border-field-line/30 px-4 py-2 text-sm text-field-cream/50 hover:bg-field-turf/20 transition disabled:opacity-50"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              disabled={saving || !goalInput.trim()}
              className="flex-1 rounded-lg bg-field-gold px-4 py-2 text-sm font-semibold text-field-dark hover:bg-field-gold/90 transition disabled:opacity-50"
            >
              {saving ? "Saving…" : "Set Goal"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}