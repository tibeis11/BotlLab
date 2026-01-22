export interface FlavorTag {
  id: string;
  label: string;
  category: "fruity" | "malty" | "hoppy" | "roasted" | "spicy" | "other";
  icon: string; // Emoji
  description?: string;
}

export const FLAVOR_TAGS: FlavorTag[] = [
  // Fruchtig
  { id: "citrus", label: "Zitrus", category: "fruity", icon: "🍋" },
  { id: "tropical", label: "Tropisch", category: "fruity", icon: "🍍" },
  { id: "berry", label: "Beerig", category: "fruity", icon: "🫐" },
  { id: "stone_fruit", label: "Steinobst", category: "fruity", icon: "🍑" },

  // Malzig
  { id: "bread", label: "Brot", category: "malty", icon: "🍞" },
  { id: "caramel", label: "Karamell", category: "malty", icon: "🍮" },
  { id: "chocolate", label: "Schokolade", category: "malty", icon: "🍫" },
  { id: "honey", label: "Honig", category: "malty", icon: "🍯" },

  // Hopfig
  { id: "floral", label: "Blumig", category: "hoppy", icon: "🌸" },
  { id: "herbal", label: "Kräuter", category: "hoppy", icon: "🌿" },
  { id: "pine", label: "Harzig", category: "hoppy", icon: "🌲" },
  { id: "grassy", label: "Grasig", category: "hoppy", icon: "🌾" },

  // Geröstet
  { id: "roasted", label: "Röstig", category: "roasted", icon: "☕" },
  { id: "coffee", label: "Kaffee", category: "roasted", icon: "☕" },
  { id: "smoky", label: "Rauchig", category: "roasted", icon: "🔥" },

  // Würzig
  { id: "spicy", label: "Würzig", category: "spicy", icon: "🌶️" },
  { id: "peppery", label: "Pfeffrig", category: "spicy", icon: "🫚" },
  { id: "clove", label: "Nelke", category: "spicy", icon: "🔸" },

  // Sonstiges
  { id: "yeast", label: "Hefe", category: "other", icon: "🍺" },
  { id: "sour", label: "Sauer", category: "other", icon: "🍋" },
  { id: "funky", label: "Funky", category: "other", icon: "🧀" },
  { id: "mineral", label: "Mineralisch", category: "other", icon: "💎" },
];

export interface TasteSlider {
  id: string;
  label: string;
  minLabel: string;
  maxLabel: string;
  minValue: number;
  maxValue: number;
  defaultValue: number;
  description: string;
}

export const TASTE_SLIDERS: TasteSlider[] = [
  {
    id: "taste_bitterness",
    label: "Bitterkeit",
    minLabel: "Mild",
    maxLabel: "Sehr bitter",
    minValue: 1,
    maxValue: 10,
    defaultValue: 5,
    description: "Wie stark schmeckst du die Hopfenbitterkeit?",
  },
  {
    id: "taste_sweetness",
    label: "Süße",
    minLabel: "Herb",
    maxLabel: "Sehr süß",
    minValue: 1,
    maxValue: 10,
    defaultValue: 5,
    description: "Wie süß ist das Bier?",
  },
  {
    id: "taste_body",
    label: "Körper",
    minLabel: "Wässrig",
    maxLabel: "Vollmundig",
    minValue: 1,
    maxValue: 10,
    defaultValue: 5,
    description: 'Wie "schwer" fühlt sich das Bier im Mund an?',
  },
  {
    id: "taste_carbonation",
    label: "Kohlensäure",
    minLabel: "Flach",
    maxLabel: "Spritzig",
    minValue: 1,
    maxValue: 10,
    defaultValue: 5,
    description: "Wie stark ist die Kohlensäure?",
  },
  {
    id: "taste_acidity",
    label: "Säure",
    minLabel: "Mild",
    maxLabel: "Sauer",
    minValue: 1,
    maxValue: 10,
    defaultValue: 5,
    description: "Schmeckst du eine säuerliche Note?",
  },
];
