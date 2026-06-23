export default function AppLoading() {
  return (
    <div className="px-4 py-8 animate-pulse">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-8 w-48 rounded bg-field-turf/20" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-field-turf/15" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-field-turf/10" />
      </div>
    </div>
  );
}