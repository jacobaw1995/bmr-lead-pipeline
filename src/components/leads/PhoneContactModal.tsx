"use client";

import { useEffect } from "react";
import { phoneSmsHref, phoneTelHref } from "@/lib/leads/phone";

interface PhoneContactModalProps {
  phone: string;
  open: boolean;
  onClose: () => void;
}

export function PhoneContactModal({
  phone,
  open,
  onClose,
}: PhoneContactModalProps) {
  const tel = phoneTelHref(phone);
  const sms = phoneSmsHref(phone);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-field-dark/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-labelledby="phone-contact-title"
        className="relative w-full max-w-sm rounded-xl border border-field-line/25 bg-field-dark p-5 shadow-2xl space-y-4"
      >
        <h3
          id="phone-contact-title"
          className="text-lg font-bold text-field-cream"
        >
          Contact customer
        </h3>
        <p className="text-sm text-field-cream/55">{phone}</p>
        <div className="grid grid-cols-2 gap-2">
          {tel && (
            <a
              href={tel}
              onClick={onClose}
              className="min-h-[48px] flex items-center justify-center rounded-xl border border-field-line/25 bg-field-turf/15 px-3 text-sm font-semibold text-field-cream hover:bg-field-turf/25 hover:border-field-gold/40 transition"
            >
              Call
            </a>
          )}
          {sms && (
            <a
              href={sms}
              onClick={onClose}
              className="min-h-[48px] flex items-center justify-center rounded-xl border border-field-line/25 bg-field-turf/15 px-3 text-sm font-semibold text-field-cream hover:bg-field-turf/25 hover:border-field-gold/40 transition"
            >
              Text
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[48px] text-sm text-field-cream/60 hover:text-field-cream transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}