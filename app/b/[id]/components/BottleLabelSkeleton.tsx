'use client';

/**
 * BottleLabelSkeleton — zeigt dem User sofort das erwartete Layout
 * während /b/[id] seine Daten lädt. Ersetzt den schwarzen Spinner.
 * Layout entspricht dem echten Seiten-Aufbau (Phase 1.3).
 */

const Shimmer = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-zinc-800 rounded ${className}`} />
);

export default function BottleLabelSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center">
      {/* Hero — Label-Bild Placeholder */}
      <div className="relative w-full max-w-2xl mx-auto overflow-hidden">
        <div className="aspect-square w-full bg-zinc-900 animate-pulse" />
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 pb-10 flex flex-col gap-5 mt-6">

        {/* Name + Stil-Badge */}
        <div className="flex flex-col gap-2">
          <Shimmer className="h-7 w-3/4" />
          <div className="flex gap-2 mt-1">
            <Shimmer className="h-5 w-20 rounded-full" />
            <Shimmer className="h-5 w-16 rounded-full" />
          </div>
        </div>

        {/* Stats-Grid: ABV / IBU / Farbe */}
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-zinc-900 rounded-xl p-3 flex flex-col gap-2">
              <Shimmer className="h-3 w-10" />
              <Shimmer className="h-6 w-14" />
            </div>
          ))}
        </div>

        {/* Rating CTA Placeholder */}
        <div className="bg-zinc-900 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Shimmer className="h-5 w-28" />
            <Shimmer className="h-4 w-16 ml-auto rounded-full" />
          </div>
          <Shimmer className="h-10 w-full rounded-lg" />
        </div>

        {/* Details-Box */}
        <div className="bg-zinc-900 rounded-xl p-4 flex flex-col gap-2">
          <Shimmer className="h-4 w-24" />
          <Shimmer className="h-3 w-full" />
          <Shimmer className="h-3 w-5/6" />
          <Shimmer className="h-3 w-4/6" />
        </div>

        {/* Brauerei-Block */}
        <div className="flex items-center gap-3 bg-zinc-900 rounded-xl p-4">
          <Shimmer className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex flex-col gap-1.5 flex-1">
            <Shimmer className="h-4 w-32" />
            <Shimmer className="h-3 w-20" />
          </div>
        </div>

      </div>
    </div>
  );
}
