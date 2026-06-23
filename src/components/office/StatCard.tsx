interface StatCardProps {
  label: string;
  value: string | number;
  detail?: string;
  highlight?: boolean;
}

export function StatCard({ label, value, detail, highlight }: StatCardProps) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        highlight
          ? "border-field-gold/30 bg-field-gold/5"
          : "border-field-line/20 bg-field-dark/40"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-field-cream/50">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-bold ${
          highlight ? "text-field-gold" : "text-field-cream"
        }`}
      >
        {value}
      </p>
      {detail && (
        <p className="mt-1 text-xs text-field-cream/40">{detail}</p>
      )}
    </div>
  );
}