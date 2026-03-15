import { supabase as browserClient } from "@/lib/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

// Caller can pass a server-side client; falls back to the browser client.
type AnySupabaseClient = SupabaseClient<any, any, any>;

export interface LegacyMaltItem {
  id?: string;
  master_id?: string;
  product_id?: string;
  name: string;
  manufacturer?: string;
  amount: number | string;
  unit: string;
  color?: number | string;
}

export interface LegacyHopItem {
  id?: string;
  master_id?: string;
  product_id?: string;
  name: string;
  manufacturer?: string;
  amount: number | string;
  unit: string;
  time: number | string;
  usage: string;
  alpha?: number | string;
}

export interface LegacyYeastItem {
  id?: string;
  master_id?: string;
  product_id?: string;
  name: string;
  manufacturer?: string;
  amount: number | string;
  unit: string;
  attenuation?: number | string;
}

export async function mergeRecipeIngredientsIntoData(
  brewData: any,
  brewId: string,
  client?: AnySupabaseClient
) {
  const sb = client ?? browserClient;
  // Query recipe_ingredients for this brew
  const { data: ingredients, error } = await sb
    .from('recipe_ingredients')
    .select('*, ingredient_master(name), ingredient_products(manufacturer)')
    .eq('recipe_id', brewId);
  
  if (error || !ingredients) {
    console.error("Error fetching recipe ingredients for adapter:", error);
    return brewData; // Fallback to current state
  }

  // Group by type and map back to Legacy interfaces
  const malts: LegacyMaltItem[] = ingredients
    .filter((i) => i.type === 'malt')
    .map((i) => ({
      id: i.id,
      master_id: i.master_id || undefined,
      product_id: i.product_id || undefined,
      name: i.raw_name || (i.ingredient_master as any)?.name || 'Unbekanntes Malz',
      manufacturer: (i.ingredient_products as any)?.manufacturer || undefined,
      amount: i.amount || 0,
      unit: i.unit || 'kg',
      color: i.override_color_ebc || undefined
    }));

  const hops: LegacyHopItem[] = ingredients
    .filter((i) => i.type === 'hop')
    .map((i) => ({
      id: i.id,
      master_id: i.master_id || undefined,
      product_id: i.product_id || undefined,
      name: i.raw_name || (i.ingredient_master as any)?.name || 'Unbekannter Hopfen',
      manufacturer: (i.ingredient_products as any)?.manufacturer || undefined,
      amount: i.amount || 0,
      unit: i.unit || 'g',
      time: i.time_minutes || 0,
      usage: i.usage || 'boil',
      alpha: i.override_alpha || undefined
    }));

  const yeast: LegacyYeastItem[] = ingredients
    .filter((i) => i.type === 'yeast')
    .map((i) => ({
      id: i.id,
      master_id: i.master_id || undefined,
      product_id: i.product_id || undefined,
      name: i.raw_name || (i.ingredient_master as any)?.name || 'Unbekannte Hefe',
      manufacturer: (i.ingredient_products as any)?.manufacturer || undefined,
      amount: i.amount || 0,
      unit: i.unit || 'pkg',
      attenuation: i.override_attenuation || undefined
    }));

  // Re-inject simulating perfectly the old jsonb format for frontend sync math
  // We strictly fall back to brewData arrays in case this is unmigrated seed data!
  return {
    ...brewData,
    malts: malts.length > 0 ? malts : (brewData.malts || []),
    hops: hops.length > 0 ? hops : (brewData.hops || []),
    yeast: yeast.length > 0 ? yeast : (brewData.yeast || [])
  };
}

export async function extractAndSaveRecipeIngredients(
  recipeId: string,
  dataObj: any,
  client?: AnySupabaseClient
) {
  const sb = client ?? browserClient;
  // We extract malts, hops, yeast from the incoming JSONB and save them individually
  // Since we don't have a reliable match right away without rewriting the entire frontend UI,
  // we do the exact inverse of our migration:
  
  if (!dataObj) return { extracted: false, sanitisedData: dataObj };

  const malts = dataObj.malts || [];
  const hops = dataObj.hops || [];
  const yeast = dataObj.yeast || [];

  // First, delete existing to prevent duplicates on update
  const { error: deleteError } = await sb.from('recipe_ingredients').delete().eq('recipe_id', recipeId);
  if (deleteError) {
    console.error('Failed to clear existing recipe ingredients:', deleteError);
    return { extracted: false, sanitisedData: dataObj };
  }

  const inserts: any[] = [];

  for (let i = 0; i < malts.length; i++) {
    const m = malts[i];
    inserts.push({
      recipe_id: recipeId,
      master_id: m.master_id || null,
      product_id: m.product_id || null,
      raw_name: m.name || 'Unbekanntes Malz',
      type: 'malt',
      amount: m.amount || null,
      unit: m.unit || 'kg',
      override_color_ebc: m.color || null,
      sort_order: i
    });
  }

  for (let i = 0; i < hops.length; i++) {
    const h = hops[i];
    inserts.push({
      recipe_id: recipeId,
      master_id: h.master_id || null,
      product_id: h.product_id || null,
      raw_name: h.name || 'Unbekannter Hopfen',
      type: 'hop',
      amount: h.amount || null,
      unit: h.unit || 'g',
      time_minutes: h.time || null,
      usage: h.usage || 'boil',
      override_alpha: h.alpha || null,
      sort_order: i
    });
  }

  for (let i = 0; i < yeast.length; i++) {
    const y = yeast[i];
    inserts.push({
      recipe_id: recipeId,
      master_id: y.master_id || null,
      product_id: y.product_id || null,
      raw_name: y.name || 'Unbekannte Hefe',
      type: 'yeast',
      amount: y.amount || null,
      unit: y.unit || 'pkg',
      override_attenuation: y.attenuation || null,
      sort_order: i
    });
  }

  if (inserts.length > 0) {
    const { error } = await sb.from('recipe_ingredients').insert(inserts);
    if (error) {
      console.error("Failed to extract ingredients on save:", error);
    }
  }

  // Define a new object stripping the arrays so they do not write to the DB JSONB column
  const sanitisedData = { ...dataObj };
  delete sanitisedData.malts;
  delete sanitisedData.hops;
  delete sanitisedData.yeast;

  return { extracted: true, sanitisedData };
}
