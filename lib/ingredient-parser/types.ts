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

export interface ParsedMashStep {
  name?: string;
  temperature_c: number;
  duration_minutes: number;
  step_type?: 'rest' | 'decoction' | 'strike' | 'mashout';
  // Dekoktions-spezifisch
  volume_liters?: number;
  decoction_form?: 'thick' | 'thin' | 'liquid';
  decoction_rest_temp?: number;
  decoction_rest_time?: number;
  decoction_boil_time?: number;
}

export interface ParsedRecipe {
  name: string;
  brewer?: string;
  batch_size_liters?: number;
  boil_size_liters?: number;
  style_name?: string;
  ingredients: ParsedIngredient[];
  description?: string;
  notes?: string;
  boil_time_minutes?: number;
  fermentation_temp_c?: number;
  efficiency?: number;
  mash_process?: string;
  carbonation_g_l?: number;
  mash_steps?: ParsedMashStep[];
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
