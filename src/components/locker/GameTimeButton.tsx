"use client";

import Link from "next/link";

interface GameTimeButtonProps {
  actionCount: number;
  isAllClear?: boolean;
}

export function GameTimeButton({
  actionCount,
  isAllClear = false,
}: GameTimeButtonProps) {
  const label = isAllClear ? "Hit the Field" : "Let's Go";
  const subtext = isAllClear
    ? "Calendar's clear — go work your pipeline"
    : "Head to The Field to execute";

  return (
    <div className="sticky bottom-0 pt-4 pb-6 safe-area-bottom bg-gradient-to-t from-field-turf via-field-turf to-transparent">
      <Link
        href="/field"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-field-gold px-6 py-4 text-base font-bold text-field-dark shadow-lg shadow-field-gold/20 hover:bg-field-gold/90 active:scale-[0.98] transition min-h-[52px]"
      >
        <span className="text-xl" aria-hidden>
          🏈
        </span>
        {label}
        {actionCount > 0 && (
          <span className="rounded-full bg-field-dark/20 px-2 py-0.5 text-xs font-semibold">
            {actionCount} on deck
          </span>
        )}
      </Link>
      <p className="text-center text-[10px] text-field-cream/35 mt-2">
        {subtext}
      </p>
    </div>
  );
}