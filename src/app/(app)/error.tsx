"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="px-4 py-16 flex items-center justify-center min-h-[50vh]">
      <div className="max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-950/30 border border-red-800/30 mb-4 text-2xl">
          ⚠️
        </div>
        <h2 className="text-lg font-bold text-field-cream mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-field-cream/50 mb-6 leading-relaxed">
          {error.message || "An unexpected error occurred loading this page."}
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-field-gold px-6 py-2.5 text-sm font-semibold text-field-dark hover:bg-field-gold/90 transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}