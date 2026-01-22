"use client";

import { FlavorDistribution } from "@/lib/rating-analytics";

export default function FlavorTagCloud({
  tags,
}: {
  tags: FlavorDistribution[];
}) {
  if (tags.length === 0)
    return <div className="text-zinc-500 text-center">Noch keine Tags.</div>;

  // Simple size calculation based on percentage
  // min size 0.8rem, max size 1.5rem
  const getSize = (pct: number) => 0.8 + (pct / 100) * 0.7;
  const getOpacity = (pct: number) => 0.4 + (pct / 100) * 0.6;

  // Sort by count desc
  const sortedTags = [...tags].sort((a, b) => b.count - a.count);

  return (
    <div className="flex flex-wrap gap-2 justify-center p-4">
      {sortedTags.map((tag) => (
        <span
          key={tag.tagId}
          className="bg-zinc-800/50 rounded px-2 py-1 text-cyan-400 border border-cyan-400/20"
          style={{
            fontSize: `${getSize(tag.percentage)}rem`,
            opacity: getOpacity(tag.percentage),
          }}
        >
          {tag.label} <span className="text-xs opacity-50">({tag.count})</span>
        </span>
      ))}
    </div>
  );
}
