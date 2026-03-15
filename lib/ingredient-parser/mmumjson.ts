import { IRecipeParser, ParsedRecipe, BaseIngredientType } from "./types";

export class MMuMJsonParser implements IRecipeParser {
  canParse(content: string): boolean {
    const text = content.trim();
    if (!text.startsWith("{")) return false;
    try {
      const obj = JSON.parse(text);
      return !!(obj.Rezeptquelle === "www.maischemalzundmehr.de" || (obj.Name && obj.Malze && obj.Hopfenkochen));
    } catch {
      return false;
    }
  }

  parse(content: string): ParsedRecipe[] {
    const recipe = JSON.parse(content);
    
    const parsedRecipe: ParsedRecipe = {
      name: recipe.Name || "MMuM Rezept",
      brewer: recipe.Autor,
      batch_size_liters: parseFloat(recipe.Ausschlagwuerze) || parseFloat(recipe.Hauptguss) || 20,
      style_name: recipe.Sorte,
      ingredients: []
    };

    if (Array.isArray(recipe.Malze)) {
      recipe.Malze.forEach((m: any) => {
        parsedRecipe.ingredients.push({
          raw_name: m.Name,
          type: "malt",
          amount: parseFloat(m.Menge) || 0,
          unit: "kg",
          usage: "mash"
        });
      });
    }

    if (Array.isArray(recipe.Hopfenkochen)) {
      recipe.Hopfenkochen.forEach((h: any) => {
        parsedRecipe.ingredients.push({
          raw_name: h.Sorte,
          type: "hop",
          amount: parseFloat(h.Menge) || 0,
          unit: "g",
          override_alpha: parseFloat(h.Alpha),
          time_minutes: parseFloat(h.Zeit),
          usage: h.Typ === "Vorderwuerze" ? "first wort" : "boil"
        });
      });
    }

    if (recipe.Hefe) {
      const yeastNames = recipe.Hefe.split(",").map((y: string) => y.trim());
      yeastNames.forEach((yName: string) => {
         parsedRecipe.ingredients.push({
          raw_name: yName,
          type: "yeast",
          amount: 1,
          unit: "pkg",
          override_attenuation: parseFloat(recipe.Endvergaerungsgrad) || undefined
        });
      });
    }

    return [parsedRecipe];
  }
}