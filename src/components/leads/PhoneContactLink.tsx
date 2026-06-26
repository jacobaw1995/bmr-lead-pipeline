"use client";

import { useState } from "react";
import { PhoneContactModal } from "./PhoneContactModal";

interface PhoneContactLinkProps {
  phone: string;
  className?: string;
  children?: React.ReactNode;
}

export function PhoneContactLink({
  phone,
  className,
  children,
}: PhoneContactLinkProps) {
  const [open, setOpen] = useState(false);

  if (!phone.trim()) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        {children ?? phone}
      </button>
      <PhoneContactModal
        phone={phone}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}