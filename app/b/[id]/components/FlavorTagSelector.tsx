import { FLAVOR_TAGS } from "@/lib/rating-config";

interface FlavorTagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  maxSelection?: number;
}

export default function FlavorTagSelector({
  selectedTags,
  onChange,
  maxSelection = 8,
}: FlavorTagSelectorProps) {
  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter((t) => t !== tagId));
    } else if (selectedTags.length < maxSelection) {
      onChange([...selectedTags, tagId]);
    }
  };

  const groupedTags = FLAVOR_TAGS.reduce(
    (acc, tag) => {
      if (!acc[tag.category]) acc[tag.category] = [];
      acc[tag.category].push(tag);
      return acc;
    },
    {} as Record<string, typeof FLAVOR_TAGS>,
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-bold text-white">
          Geschmacksnoten auswählen
        </h4>
        <span className="text-xs text-zinc-500">
          {selectedTags.length}/{maxSelection} ausgewählt
        </span>
      </div>

      {Object.entries(groupedTags).map(([category, tags]) => (
        <div key={category}>
          <div className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider mb-2">
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
                  className={`
                    px-3 py-2 rounded-xl border-2 font-medium text-sm transition-all
                    flex items-center gap-2
                    ${
                      isSelected
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-400"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600"
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
