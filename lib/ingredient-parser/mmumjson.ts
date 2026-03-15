import { IRecipeParser, ParsedRecipe, ParsedMashStep } from "./types";
import { clampAmount } from "./utils";

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
      batch_size_liters:
        parseFloat(recipe.Ausschlagwuerze) > 0 ? parseFloat(recipe.Ausschlagwuerze)
        : parseFloat(recipe.Hauptguss) > 0 ? parseFloat(recipe.Hauptguss)
        : parseFloat(recipe.Einmaisch_Zubruehwasser_gesamt) > 0 ? parseFloat(recipe.Einmaisch_Zubruehwasser_gesamt)
        : 20,
      style_name: recipe.Sorte,
      ingredients: [],
      description: recipe.Kurzbeschreibung || recipe.Bemerkung || recipe.Anmerkung || undefined,
      notes: recipe.Anmerkung_Autor || undefined,
      boil_time_minutes: parseFloat(recipe.Kochzeit_Wuerze) > 0 ? parseFloat(recipe.Kochzeit_Wuerze) : undefined,
      fermentation_temp_c:
        parseFloat(recipe.Gaertemperatur) > 0 ? parseFloat(recipe.Gaertemperatur)
        : parseFloat(recipe.Gaer_Temp_1) > 0 ? parseFloat(recipe.Gaer_Temp_1)
        : undefined,
      efficiency:
        parseFloat(recipe.Sudhausausbeute) > 0 ? parseFloat(recipe.Sudhausausbeute)
        : parseFloat(recipe.Ausbeute) > 0 ? parseFloat(recipe.Ausbeute)
        : undefined,
      mash_process: recipe.Maischform === 'dekoktion' ? 'decoction' : recipe.Maischform ? 'infusion' : undefined,
      carbonation_g_l: parseFloat(recipe.Karbonisierung) > 0 ? parseFloat(recipe.Karbonisierung) : undefined,
      mash_steps: this.parseMashSteps(recipe),
    };

    if (Array.isArray(recipe.Malze)) {
      recipe.Malze.forEach((m: any) => {
        parsedRecipe.ingredients.push({
          raw_name: m.Name,
          type: "malt",
          amount: clampAmount(parseFloat(m.Menge) || 0, 'malt'),
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
          amount: clampAmount(parseFloat(h.Menge) || 0, 'hop'),
          unit: "g",
          override_alpha: parseFloat(h.Alpha),
          time_minutes: parseFloat(h.Zeit),
          usage: this.mapHopTyp(h.Typ),
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

  private mapHopTyp(typ: string | undefined): string {
    switch (typ) {
      case 'Vorderwuerze': return 'first wort';
      case 'Stopfen':      return 'dry hop';
      case 'Whirlpool':    return 'whirlpool';
      case 'Standard':
      default:             return 'boil';
    }
  }

  private parseMashSteps(recipe: any): ParsedMashStep[] | undefined {
    if (recipe.Maischform === 'dekoktion' && Array.isArray(recipe.Dekoktionen) && recipe.Dekoktionen.length > 0) {
      return this.parseDekoktionen(recipe.Dekoktionen);
    }

    if (Array.isArray(recipe.Rasten) && recipe.Rasten.length > 0) {
      const result = recipe.Rasten
        .map((r: any): ParsedMashStep | null => {
          const temp = parseFloat(r.Temperatur);
          const time = parseFloat(r.Zeit);
          if (isNaN(temp) || isNaN(time)) return null;
          return {
            name: r.Rastname || r.Name || undefined,
            temperature_c: temp,
            duration_minutes: time,
            step_type: 'rest' as const,
          };
        })
        .filter((s: ParsedMashStep | null): s is ParsedMashStep => s !== null);
      return result.length > 0 ? result : undefined;
    }

    return undefined;
  }

  private parseDekoktionen(dekoktionen: any[]): ParsedMashStep[] {
    return dekoktionen
      .map((d: any): ParsedMashStep | null => {
        const temp = parseFloat(d.Temperatur_resultierend);
        const time = parseFloat(d.Rastzeit);
        if (isNaN(temp) || isNaN(time)) return null;
        return {
          step_type: 'decoction' as const,
          temperature_c: temp,
          duration_minutes: time,
          volume_liters: parseFloat(d.Volumen) > 0 ? parseFloat(d.Volumen) : undefined,
          decoction_form: this.mapDecoctionForm(d.Form),
          decoction_rest_temp: parseFloat(d.Teilmaische_Temperatur) > 0 ? parseFloat(d.Teilmaische_Temperatur) : undefined,
          decoction_rest_time: parseFloat(d.Teilmaische_Rastzeit) > 0 ? parseFloat(d.Teilmaische_Rastzeit) : undefined,
          decoction_boil_time: parseFloat(d.Teilmaische_Kochzeit) > 0 ? parseFloat(d.Teilmaische_Kochzeit) : undefined,
        };
      })
      .filter((s): s is ParsedMashStep => s !== null);
  }

  private mapDecoctionForm(form: string | undefined): 'thick' | 'thin' | 'liquid' | undefined {
    if (!form) return undefined;
    if (form === 'Dickmaische') return 'thick';
    if (form === 'Dünnmaische' || form === 'D\u00fcnnmaische') return 'thin';
    if (form === 'Kochendes Wasser') return 'liquid';
    return 'thick';
  }
}
