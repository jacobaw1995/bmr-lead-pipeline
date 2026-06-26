export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function phoneTelHref(phone: string): string {
  const digits = phoneDigits(phone);
  return digits ? `tel:${digits}` : "";
}

export function phoneSmsHref(phone: string): string {
  const digits = phoneDigits(phone);
  return digits ? `sms:${digits}` : "";
}