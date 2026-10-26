export function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="skeleton w-4 h-4 rounded" />
        <div className="skeleton h-4 flex-1 rounded" />
        <div className="skeleton w-16 h-5 rounded-full" />
      </div>
      <div className="skeleton h-3 w-3/4 rounded" />
      <div className="flex items-center gap-2">
        <div className="skeleton h-1.5 flex-1 rounded-full" />
        <div className="skeleton w-8 h-3 rounded" />
      </div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="skeleton w-20 h-3 rounded" />
        <div className="skeleton w-8 h-8 rounded-lg" />
      </div>
      <div className="skeleton w-12 h-7 rounded" />
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton h-3 rounded ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}
