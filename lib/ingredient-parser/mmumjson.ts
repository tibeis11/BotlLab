import { IRecipeParser, ParsedRecipe, ParsedMashStep } from "./types";
import { clampAmount } from "./utils";

/**
 * Repariert Latin-1-in-UTF-8-Doppelkodierung (häufiger Bug auf maischemalzundmehr.de).
 * "Ã¼" → "ü", "Ã¶" → "ö" etc.
 */
function fixEncoding(s: unknown): string {
  if (typeof s !== 'string') return String(s ?? '');
  try {
    return decodeURIComponent(escape(s));
  } catch {
    return s;
  }
}

/**
 * Extrahiert die erste Zahl aus einem Wert — auch wenn er ein String wie "18 - 22°C" ist.
 */
function extractNumber(val: unknown): number {
  const n = parseFloat(String(val ?? ''));
  if (!isNaN(n) && n > 0) return n;
  const match = String(val ?? '').match(/\d+([.,]\d+)?/);
  return match ? parseFloat(match[0].replace(',', '.')) : NaN;
}

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

    const fermentationTemp = (() => {
      const t1 = extractNumber(recipe.Gaertemperatur);
      if (!isNaN(t1) && t1 > 0) return t1;
      const t2 = extractNumber(recipe.Gaer_Temp_1);
      return (!isNaN(t2) && t2 > 0) ? t2 : undefined;
    })();

    const parsedRecipe: ParsedRecipe = {
      name: fixEncoding(recipe.Name) || "MMuM Rezept",
      brewer: recipe.Autor,
      batch_size_liters:
        parseFloat(recipe.Ausschlagwuerze) > 0 ? parseFloat(recipe.Ausschlagwuerze)
        : parseFloat(recipe.Hauptguss) > 0 ? parseFloat(recipe.Hauptguss)
        : parseFloat(recipe.Einmaisch_Zubruehwasser_gesamt) > 0 ? parseFloat(recipe.Einmaisch_Zubruehwasser_gesamt)
        : 20,
      style_name: recipe.Sorte,
      ingredients: [],
      description: fixEncoding(recipe.Kurzbeschreibung || recipe.Bemerkung || recipe.Anmerkung) || undefined,
      notes: fixEncoding(recipe.Anmerkung_Autor) || undefined,
      boil_time_minutes: parseFloat(recipe.Kochzeit_Wuerze) > 0 ? parseFloat(recipe.Kochzeit_Wuerze) : undefined,
      fermentation_temp_c: fermentationTemp,
      efficiency:
        parseFloat(recipe.Sudhausausbeute) > 0 ? parseFloat(recipe.Sudhausausbeute)
        : parseFloat(recipe.Ausbeute) > 0 ? parseFloat(recipe.Ausbeute)
        : undefined,
      mash_process: recipe.Maischform === 'dekoktion' ? 'decoction' : recipe.Maischform ? 'infusion' : undefined,
      carbonation_g_l: parseFloat(recipe.Karbonisierung) > 0 ? parseFloat(recipe.Karbonisierung) : undefined,
      mash_steps: this.parseMashSteps(recipe, parseFloat(recipe.Einmaischtemperatur)),
    };

    if (Array.isArray(recipe.Malze)) {
      recipe.Malze.forEach((m: any) => {
        const rawAmount = parseFloat(m.Menge) || 0;
        const amountKg = String(m.Einheit).toLowerCase() === 'g' ? rawAmount / 1000 : rawAmount;
        parsedRecipe.ingredients.push({
          raw_name: fixEncoding(m.Name),
          type: "malt",
          amount: clampAmount(amountKg, 'malt'),
          unit: "kg",
          usage: "mash",
        });
      });
    }

    if (Array.isArray(recipe.Hopfenkochen)) {
      recipe.Hopfenkochen.forEach((h: any) => {
        parsedRecipe.ingredients.push({
          raw_name: fixEncoding(h.Sorte),
          type: "hop",
          amount: clampAmount(parseFloat(h.Menge) || 0, 'hop'),
          unit: "g",
          override_alpha: parseFloat(h.Alpha) || undefined,
          time_minutes: parseFloat(h.Zeit),
          usage: this.mapHopTyp(h.Typ),
        });
      });
    }

    if (Array.isArray(recipe.Stopfhopfen)) {
      recipe.Stopfhopfen.forEach((h: any) => {
        parsedRecipe.ingredients.push({
          raw_name: fixEncoding(h.Sorte),
          type: "hop",
          amount: clampAmount(parseFloat(h.Menge) || 0, 'hop'),
          unit: "g",
          override_alpha: parseFloat(h.Alpha) || undefined,
          time_minutes: 0,
          usage: 'dry hop',
        });
      });
    }

    if (recipe.Hefe) {
      const yeastNames = fixEncoding(recipe.Hefe).split(",").map((y: string) => y.trim());
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

    if (Array.isArray(recipe.Gewuerze_etc)) {
      recipe.Gewuerze_etc.forEach((g: any) => {
        const name = fixEncoding(g.Name || g.Sorte || '');
        if (!name) return;
        parsedRecipe.ingredients.push({
          raw_name: name,
          type: 'hop',
          amount: clampAmount(parseFloat(g.Menge) || 1, 'hop'),
          unit: g.Einheit || 'g',
          time_minutes: parseFloat(g.Kochzeit) || 0,
          usage: 'spice',
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

  private parseMashSteps(recipe: any, einmaischTemp?: number): ParsedMashStep[] | undefined {
    const strikeStep: ParsedMashStep | null = (!isNaN(einmaischTemp!) && einmaischTemp! > 0)
      ? { name: 'Einmaischen', temperature_c: einmaischTemp!, duration_minutes: 0, step_type: 'strike' }
      : null;

    if (recipe.Maischform === 'dekoktion' && Array.isArray(recipe.Dekoktionen) && recipe.Dekoktionen.length > 0) {
      const steps = this.parseDekoktionen(recipe.Dekoktionen);
      return strikeStep ? [strikeStep, ...steps] : steps;
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
      const steps = result.length > 0 ? result : [];
      return strikeStep ? [strikeStep, ...steps] : (steps.length > 0 ? steps : undefined);
    }

    return strikeStep ? [strikeStep] : undefined;
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
