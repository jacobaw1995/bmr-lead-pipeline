export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCycleDays(createdAt: string, closedAt: string): number {
  const ms = new Date(closedAt).getTime() - new Date(createdAt).getTime();
  return Math.max(1, Math.round(ms / 86400000));
}