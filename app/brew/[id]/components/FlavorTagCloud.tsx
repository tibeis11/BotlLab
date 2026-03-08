"use client";

import { FlavorDistribution } from "@/lib/rating-analytics";

export default function FlavorTagCloud({
  tags,
}: {
  tags: FlavorDistribution[];
}) {
  if (tags.length === 0)
    return <div className="text-text-muted text-sm text-center py-4">Noch keine Attribut-Daten.</div>;

  const sorted = [...tags].sort((a, b) => b.count - a.count).slice(0, 8);
  const max = Math.max(...sorted.map(t => t.count), 1);

  return (
    <div className="flex flex-col gap-2 w-full">
      {sorted.map((tag) => (
        <div key={tag.tagId} className="flex items-center gap-3 group">
          <span className="text-xs text-text-secondary font-semibold w-24 shrink-0 truncate text-right">
            {tag.label}
          </span>
          <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-brand/70 rounded-full transition-all duration-500 group-hover:bg-brand-hover"
              style={{ width: `${(tag.count / max) * 100}%` }}
            />
          </div>
          <span className="text-xs text-text-disabled w-5 text-right font-mono shrink-0">{tag.count}</span>
        </div>
      ))}
    </div>
  );
}

