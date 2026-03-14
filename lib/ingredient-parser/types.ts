export type BaseIngredientType = 'malt' | 'hop' | 'yeast' | 'misc' | 'water';

export interface ParsedIngredient {
  raw_name: string;
  type: BaseIngredientType;
  amount: number;         // Immer in Basis-Einheiten versuchen: kg für Malz, g für Hopfen, etc.
  unit: string;           // 'kg', 'g', 'l', 'ml', 'pkg' etc.
  time_minutes?: number;
  usage?: string;         // 'mash', 'boil', 'dry hop', 'primary', etc.
  
  // Spezifische Werte (aus Rezept, die defaults überschreiben können)
  override_alpha?: number;
  override_color_ebc?: number;
  override_attenuation?: number;
  
  // Optionale Metadaten
  manufacturer?: string;
  notes?: string;
}

export interface ParsedRecipe {
  name: string;
  brewer?: string;
  batch_size_liters?: number;
  boil_size_liters?: number;
  style_name?: string;
  ingredients: ParsedIngredient[];
}

export interface IRecipeParser {
  /**
   * Identifiziert, ob dieser Parser für den übergebenen Inhalt zuständig ist.
   */
  canParse(content: string): boolean;
  
  /**
   * Parst den rohen String-Inhalt (XML/JSON) und gibt ein Array von Rezepten zurück.
   */
  parse(content: string): ParsedRecipe[];
}
