import { XMLParser } from 'fast-xml-parser';
import { IRecipeParser, ParsedRecipe, ParsedIngredient, BaseIngredientType } from './types';

export class BeerXmlParser implements IRecipeParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: true,
      parseTagValue: true,
      trimValues: true,
      // Array-Felder erzwingen, selbst wenn nur 1 Element vorhanden ist
      isArray: (name, jpath, isLeafNode, isAttribute) => {
        const arrayTags = ['RECIPE', 'FERMENTABLE', 'HOP', 'YEAST', 'MISC', 'WATER'];
        return arrayTags.includes(name.toUpperCase());
      }
    });
  }

  canParse(content: string): boolean {
    return content.includes('<RECIPES>') || content.includes('<?xml');
  }

  parse(content: string): ParsedRecipe[] {
    const jsonObj = this.parser.parse(content);
    
    // Fallback: Manchmal ist es in <RECIPES> verpackt, manchmal nur <RECIPE>
    const recipesRoot = jsonObj.RECIPES ? jsonObj.RECIPES.RECIPE : jsonObj.RECIPE;
    if (!recipesRoot) {
      return [];
    }

    const recipesArray = Array.isArray(recipesRoot) ? recipesRoot : [recipesRoot];

    return recipesArray.map((recipe: any): ParsedRecipe => {
      const parsedRecipe: ParsedRecipe = {
        name: recipe.NAME || 'Unnamed Recipe',
        brewer: recipe.BREWER,
        batch_size_liters: Number(recipe.BATCH_SIZE),
        boil_size_liters: Number(recipe.BOIL_SIZE),
        style_name: recipe.STYLE?.NAME,
        ingredients: []
      };

      // Fermentables (Malz)
      if (recipe.FERMENTABLES && recipe.FERMENTABLES.FERMENTABLE) {
        const fermentables = recipe.FERMENTABLES.FERMENTABLE;
        fermentables.forEach((f: any) => {
          const amount = Number(f.AMOUNT);
          parsedRecipe.ingredients.push({
            raw_name: f.NAME,
            type: this.mapFermentableType(f.TYPE),
            amount: isNaN(amount) ? 0 : amount, // In BeerXML immer in kg
            unit: 'kg', 
            override_color_ebc: f.COLOR ? Number(f.COLOR) * 1.97 : undefined, // SRM to EBC (BeerXML spec uses Lovibond for fermentables which ≈ SRM)
            manufacturer: f.SUPPLIER,
            notes: f.NOTES
          });
        });
      }

      // Hops
      if (recipe.HOPS && recipe.HOPS.HOP) {
        const hops = recipe.HOPS.HOP;
        hops.forEach((h: any) => {
          const amountKg = Number(h.AMOUNT);
          parsedRecipe.ingredients.push({
            raw_name: h.NAME,
            type: 'hop',
            amount: isNaN(amountKg) ? 0 : amountKg * 1000, // BeerXML spec: amount is always kg → convert to g
            unit: 'g',
            time_minutes: Number(h.TIME) || 0,
            usage: h.USE?.toLowerCase(), // z.B. 'boil', 'dry hop', 'mash'
            override_alpha: !isNaN(Number(h.ALPHA)) ? Number(h.ALPHA) : undefined,
            notes: h.NOTES
          });
        });
      }

      // Yeasts
      if (recipe.YEASTS && recipe.YEASTS.YEAST) {
        const yeasts = recipe.YEASTS.YEAST;
        yeasts.forEach((y: any) => {
          const amountRaw = Number(y.AMOUNT);
          // BeerXML spec: yeast amount is in liters. For dry yeast (small values <0.1), treat as kg.
          const amount = isNaN(amountRaw) ? 1 : (amountRaw < 0.1 ? amountRaw * 1000 : amountRaw * 1000);
          parsedRecipe.ingredients.push({
            raw_name: y.NAME,
            type: 'yeast',
            amount,
            unit: amountRaw < 0.1 ? 'g' : 'ml', // Dry yeast → g, Liquid yeast → ml
            override_attenuation: !isNaN(Number(y.ATTENUATION)) ? Number(y.ATTENUATION) : undefined,
            manufacturer: y.LABORATORY,
            notes: y.NOTES
          });
        });
      }

      // Miscs
      if (recipe.MISCS && recipe.MISCS.MISC) {
        const miscs = recipe.MISCS.MISC;
        miscs.forEach((m: any) => {
          const amount = Number(m.AMOUNT);
          parsedRecipe.ingredients.push({
            raw_name: m.NAME,
            type: 'misc',
            amount: isNaN(amount) ? 0 : amount,
            unit: m.AMOUNT_IS_WEIGHT === true || m.AMOUNT_IS_WEIGHT === 'TRUE' ? 'kg' : 'l',
            time_minutes: Number(m.TIME) || 0,
            usage: m.USE?.toLowerCase(),
            notes: m.NOTES
          });
        });
      }

      return parsedRecipe;
    });
  }

  private mapFermentableType(xmlType: string): BaseIngredientType {
    const t = (xmlType || '').toLowerCase();
    if (t.includes('sugar') || t.includes('extract') || t.includes('adjunct')) return 'misc';
    return 'malt';
  }
}
