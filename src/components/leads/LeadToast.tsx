"use client";

import { useEffect } from "react";

interface LeadToastProps {
  message: string | null;
  onDismiss: () => void;
}

export function LeadToast({ message, onDismiss }: LeadToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 3200);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] max-w-sm w-[calc(100%-2rem)] rounded-xl border border-field-gold/40 bg-field-dark/95 px-4 py-3 text-sm text-field-cream shadow-xl backdrop-blur-sm safe-area-bottom"
    >
      {message}
    </div>
  );
}