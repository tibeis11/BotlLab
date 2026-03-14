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
          parsedRecipe.ingredients.push({
            raw_name: f.NAME,
            type: this.mapFermentableType(f.TYPE),
            amount: Number(f.AMOUNT), // In BeerXML typischerweise in kg
            unit: 'kg', 
            override_color_ebc: f.COLOR ? Number(f.COLOR) * 1.97 : undefined, // SRM to EBC rough conversion if needed, but BeerXML might specify EBC depending on tool. Assuming SRM often default.
            manufacturer: f.SUPPLIER,
            notes: f.NOTES
          });
        });
      }

      // Hops
      if (recipe.HOPS && recipe.HOPS.HOP) {
        const hops = recipe.HOPS.HOP;
        hops.forEach((h: any) => {
          parsedRecipe.ingredients.push({
            raw_name: h.NAME,
            type: 'hop',
            amount: Number(h.AMOUNT) * 1000, // BeerXML amount ist kg, wir preferieren g
            unit: 'g',
            time_minutes: Number(h.TIME),
            usage: h.USE?.toLowerCase(), // z.B. 'boil', 'dry hop', 'mash'
            override_alpha: Number(h.ALPHA),
            notes: h.NOTES
          });
        });
      }

      // Yeasts
      if (recipe.YEASTS && recipe.YEASTS.YEAST) {
        const yeasts = recipe.YEASTS.YEAST;
        yeasts.forEach((y: any) => {
          parsedRecipe.ingredients.push({
            raw_name: y.NAME,
            type: 'yeast',
            amount: Number(y.AMOUNT) * 1000, // meist kg/L -> wir speichern es vorerst generisch
            unit: 'g', 
            override_attenuation: Number(y.ATTENUATION),
            manufacturer: y.LABORATORY,
            notes: y.NOTES
          });
        });
      }

      // Miscs
      if (recipe.MISCS && recipe.MISCS.MISC) {
        const miscs = recipe.MISCS.MISC;
        miscs.forEach((m: any) => {
          parsedRecipe.ingredients.push({
            raw_name: m.NAME,
            type: 'misc',
            amount: Number(m.AMOUNT),
            unit: m.AMOUNT_IS_WEIGHT ? 'kg' : 'l',
            time_minutes: Number(m.TIME),
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
