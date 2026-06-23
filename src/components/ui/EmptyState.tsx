interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-field-line/30 p-8 sm:p-10 text-center">
      {icon && (
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-field-turf/20 border border-field-line/20 mb-4 text-2xl">
          {icon}
        </div>
      )}
      <p className="text-field-cream/70 font-medium">{title}</p>
      <p className="text-sm text-field-cream/40 mt-2 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}