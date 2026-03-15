import { IRecipeParser, ParsedRecipe, ParsedIngredient, BaseIngredientType } from './types';

export class BeerJsonParser implements IRecipeParser {
  canParse(content: string): boolean {
    const text = content.trim();
    if (!text.startsWith('{') && !text.startsWith('[')) return false;

    try {
      const obj = JSON.parse(text);
      // Überprüfe rudimentäre BeerJSON/JSON-Rezept Struktur
      return !!(obj.recipes || obj.recipe || obj.beerjson);
    } catch {
      return false;
    }
  }

  parse(content: string): ParsedRecipe[] {
    const parsed = JSON.parse(content);
    
    // Extrahieren der Root-Rezepte. BeerJSON strukturiert es oft unter "beerjson.recipes"
    let rawRecipes: any[] = [];
    if (parsed.beerjson && parsed.beerjson.recipes) {
      rawRecipes = parsed.beerjson.recipes;
    } else if (parsed.recipes) {
      rawRecipes = parsed.recipes;
    } else if (parsed.recipe) {
      rawRecipes = [parsed.recipe];
    } else if (Array.isArray(parsed)) {
      rawRecipes = parsed;
    }

    return rawRecipes.map((recipe: any): ParsedRecipe => {
      const parsedRecipe: ParsedRecipe = {
        name: recipe.name || 'Unnamed BeerJSON Recipe',
        brewer: recipe.author,
        batch_size_liters: this.extractVolumeLiters(recipe.batch_size),
        boil_size_liters: this.extractVolumeLiters(recipe.boil_size),
        style_name: recipe.style?.name,
        ingredients: []
      };

      const ingredients = recipe.ingredients || {};

      // Fermentables
      if (Array.isArray(ingredients.fermentable_additions)) {
        ingredients.fermentable_additions.forEach((f: any) => {
          parsedRecipe.ingredients.push({
            raw_name: f.name,
            type: 'malt', // oder f.type mappen, falls in BeerJSON vorhanden
            amount: this.extractMassKg(f.amount),
            unit: 'kg',
            override_color_ebc: this.extractColorEBC(f.color),
            manufacturer: f.producer
          });
        });
      }

      // Hops
      if (Array.isArray(ingredients.hop_additions)) {
        ingredients.hop_additions.forEach((h: any) => {
          parsedRecipe.ingredients.push({
            raw_name: h.name,
            type: 'hop',
            amount: this.extractMassKg(h.amount) * 1000,
            unit: 'g',
            time_minutes: this.extractTimeMinutes(h.timing),
            usage: h.timing?.use,
            override_alpha: h.alpha_acids,
            manufacturer: h.producer
          });
        });
      }

      // Cultures (Yeasts)
      if (Array.isArray(ingredients.culture_additions)) {
        ingredients.culture_additions.forEach((c: any) => {
          // BeerJSON cultures can specify amount as mass or volume
          let amount = 1;
          let unit = 'pkg';
          if (c.amount?.value) {
            if (['kg', 'g', 'lb', 'oz'].includes(c.amount.unit)) {
              amount = this.extractMassKg(c.amount) * 1000;
              unit = 'g';
            } else if (['l', 'ml', 'gal'].includes(c.amount.unit)) {
              amount = (this.extractVolumeLiters(c.amount) ?? 0) * 1000;
              unit = 'ml';
            } else {
              amount = c.amount.value;
              unit = 'pkg';
            }
          }
          parsedRecipe.ingredients.push({
            raw_name: c.name,
            type: 'yeast',
            amount,
            unit,
            override_attenuation: c.attenuation,
            manufacturer: c.producer
          });
        });
      }

      // Miscs
      if (Array.isArray(ingredients.miscellaneous_additions)) {
        ingredients.miscellaneous_additions.forEach((m: any) => {
          const massKg = this.extractMassKg(m.amount);
          const volumeL = this.extractVolumeLiters(m.amount);
          let amount: number;
          let unit: string;
          if (massKg > 0) {
            amount = massKg;
            unit = 'kg';
          } else if (volumeL && volumeL > 0) {
            amount = volumeL;
            unit = 'l';
          } else {
            amount = m.amount?.value || 1;
            unit = m.amount?.unit || 'each';
          }
          parsedRecipe.ingredients.push({
            raw_name: m.name,
            type: 'misc',
            amount,
            unit,
            time_minutes: this.extractTimeMinutes(m.timing),
            usage: m.timing?.use
          });
        });
      }

      return parsedRecipe;
    });
  }

  // --- Hilfsfunktionen für das komplexe BeerJSON Struct ---
  
  private extractVolumeLiters(obj: any): number | undefined {
    if (!obj || !obj.value) return undefined;
    if (obj.unit === 'l') return obj.value;
    if (obj.unit === 'ml') return obj.value / 1000;
    if (obj.unit === 'gal') return obj.value * 3.78541;
    return obj.value;
  }

  private extractMassKg(obj: any): number {
    if (!obj || !obj.value) return 0;
    if (obj.unit === 'kg') return obj.value;
    if (obj.unit === 'g') return obj.value / 1000;
    if (obj.unit === 'lb') return obj.value * 0.453592;
    if (obj.unit === 'oz') return obj.value * 0.0283495;
    return obj.value;
  }

  private extractTimeMinutes(obj: any): number | undefined {
    if (!obj || !obj.time || !obj.time.value) return undefined;
    if (obj.time.unit === 'min') return obj.time.value;
    if (obj.time.unit === 'hr') return obj.time.value * 60;
    if (obj.time.unit === 'day') return obj.time.value * 1440;
    return obj.time.value;
  }

  private extractColorEBC(obj: any): number | undefined {
    if (!obj || !obj.value) return undefined;
    const val = obj.value;
    switch(obj.unit) {
      case 'EBC': return val;
      case 'SRM': return val * 1.97;
      case 'L': return val * 1.97; // Lovibond ist grob wie SRM
      default: return val;
    }
  }
}
