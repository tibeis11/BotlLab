'use client';

import { useMemo } from 'react';
import { FLAVOR_TAGS } from "@/lib/rating-config";

interface FlavorTagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  maxSelection?: number;
  /** Compact mode: single scrollable row, no category headers, smaller chips */
  compact?: boolean;
}

export default function FlavorTagSelector({
  selectedTags,
  onChange,
  maxSelection = 8,
  compact = false,
}: FlavorTagSelectorProps) {
  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter((t) => t !== tagId));
    } else if (selectedTags.length < maxSelection) {
      onChange([...selectedTags, tagId]);
    }
  };

  const groupedTags = useMemo(() => FLAVOR_TAGS.reduce(
    (acc, tag) => {
      if (!acc[tag.category]) acc[tag.category] = [];
      acc[tag.category].push(tag);
      return acc;
    },
    {} as Record<string, typeof FLAVOR_TAGS>,
  ), []);

  // ─── Compact mode: single scrollable row ───
  if (compact) {
    const allTags = FLAVOR_TAGS;
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-text-muted">Quick Impressions</span>
          {selectedTags.length > 0 && (
            <span className="text-[10px] text-text-disabled">{selectedTags.length}/{maxSelection}</span>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {allTags.map((tag) => {
            const isSelected = selectedTags.includes(tag.id);
            const isDisabled = !isSelected && selectedTags.length >= maxSelection;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                disabled={isDisabled}
                aria-pressed={isSelected}
                className={`
                  flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs transition-all
                  ${isSelected
                    ? 'bg-brand/20 border-brand/60 text-brand'
                    : 'bg-surface border-border text-text-muted hover:border-border-hover hover:text-text-secondary'
                  }
                  ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <span>{tag.icon}</span>
                <span>{tag.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-bold text-text-primary">
          Geschmacksnoten auswählen
        </h4>
        <span className="text-xs text-text-muted">
          {selectedTags.length}/{maxSelection} ausgewählt
        </span>
      </div>

      {Object.entries(groupedTags).map(([category, tags]) => (
        <div key={category}>
          <div className="text-[10px] uppercase font-bold text-text-disabled tracking-wider mb-2">
            {category === "fruity" && "🍇 Fruchtig"}
            {category === "malty" && "🌾 Malzig"}
            {category === "hoppy" && "🌿 Hopfig"}
            {category === "roasted" && "🔥 Geröstet"}
            {category === "spicy" && "🌶️ Würzig"}
            {category === "other" && "✨ Sonstiges"}
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const isSelected = selectedTags.includes(tag.id);
              const isDisabled =
                !isSelected && selectedTags.length >= maxSelection;

              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  disabled={isDisabled}
                  aria-pressed={isSelected}
                  aria-disabled={isDisabled ? true : undefined}
                  title={isDisabled ? `Maximum von ${maxSelection} Tags erreicht` : undefined}
                  className={`
                    px-3 py-2 rounded-xl border-2 font-medium text-sm transition-all
                    flex items-center gap-2
                    ${
                      isSelected
                        ? "bg-brand/20 border-brand text-brand"
                        : "bg-surface border-border text-text-secondary hover:border-border-hover"
                    }
                    ${isDisabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  <span>{tag.icon}</span>
                  <span>{tag.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
