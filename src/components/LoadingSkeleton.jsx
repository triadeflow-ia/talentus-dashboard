export function SkeletonCard() {
  return (
    <div className="bg-bg-card rounded-xl border border-border p-5">
      <div className="skeleton h-3 w-24 mb-3" />
      <div className="skeleton h-7 w-32 mb-2" />
      <div className="skeleton h-3 w-20" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-bg-card rounded-xl border border-border p-5">
      <div className="skeleton h-4 w-40 mb-4" />
      <div className="space-y-3">
        {[100, 80, 60, 40, 25].map((w, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-8 flex-1" style={{ maxWidth: `${w}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="bg-bg-card rounded-xl border border-border p-5">
      <div className="skeleton h-4 w-40 mb-4" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="skeleton h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-32" />
              <div className="skeleton h-3 w-48" />
            </div>
            <div className="skeleton h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonPage({ cards = 6, charts = 2 }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: charts }).map((_, i) => (
          <SkeletonChart key={i} />
        ))}
      </div>
    </div>
  );
}
