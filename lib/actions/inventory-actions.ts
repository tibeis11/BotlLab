'use server'

import { createClient } from "@/lib/supabase-server";
import { createBottleBatchSchema, batchUpdateSchema } from "@/lib/validations/inventory-schemas";
import { getPremiumStatus, getBreweryPremiumStatus } from "@/lib/actions/premium-actions";
import { getBreweryTierConfig } from "@/lib/tier-system";
import { revalidatePath } from "next/cache";

export type ActionResponse<T = any> = {
  data?: T;
  error?: string | any;
};

export async function createBottleBatch(input: { brewery_id: string; amount: number; size_l?: number }): Promise<ActionResponse> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Nicht authentifiziert" };

    // Validate
    const validation = createBottleBatchSchema.safeParse(input);
    if (!validation.success) return { error: validation.error.flatten().fieldErrors };

    const { brewery_id, amount, size_l = 0.33 } = validation.data;

    // Check Limits
    // 1. Get current count
    const { count, error: countError } = await supabase
        .from('bottles')
        .select('*', { count: 'exact', head: true })
        .eq('brewery_id', brewery_id);

    if (countError) return { error: "Fehler beim Abrufen der Flaschenanzahl." };

    // 2. Get Tier Limits (Brewery Owner's Tier Matters)
    const premiumStatus = await getBreweryPremiumStatus(brewery_id) || { tier: 'free', features: { bypassBottleLimits: false } };
    const tierConfig = getBreweryTierConfig(premiumStatus.tier as any);
    const bypassed = premiumStatus.features?.bypassBottleLimits ?? false;

    if (!bypassed && (count || 0) + amount > tierConfig.limits.maxBottles) {
        return { 
            error: `Limit erreicht! Dein Status "${tierConfig.displayName}" erlaubt maximal ${tierConfig.limits.maxBottles} Flaschen. Aktuell: ${count}. Upgrade nötig.` 
        };
    }

    // 3. Get Max Number for sequential numbering
    const { data: maxResult } = await supabase
        .from('bottles')
        .select('bottle_number')
        .eq('brewery_id', brewery_id)
        .order('bottle_number', { ascending: false })
        .limit(1)
        .maybeSingle(); // Use maybeSingle to handle 0 rows gracefully

    let currentNum = maxResult?.bottle_number || 0;

    // 4. Generate Rows
    const newRows = Array.from({ length: amount }).map(() => {
        currentNum++;
        return {
            brew_id: null,
            user_id: user.id,
            brewery_id: brewery_id,
            bottle_number: currentNum,
            size_l: size_l
        };
    });

    // 5. Insert
    const { data, error } = await supabase
        .from('bottles')
        .insert(newRows)
        .select();

    if (error) return { error: error.message };

    revalidatePath(`/team/${brewery_id}/inventory`);
    return { data };
}

export async function assignBottlesToBrew(input: { brewery_id: string, bottle_ids: string[], brew_id: string | null }): Promise<ActionResponse> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Nicht authentifiziert" };

    const validation = batchUpdateSchema.safeParse(input);
    if (!validation.success) return { error: validation.error.flatten().fieldErrors };

    const { brewery_id, bottle_ids, brew_id } = validation.data;

    // Verify ownership/permissions via RLS (implicit), but we ensure filtered by brewery_id in update
    const { data, error } = await supabase
        .from('bottles')
        .update({ brew_id })
        .in('id', bottle_ids)
        .eq('brewery_id', brewery_id) // Safety check
        .select();

    if (error) return { error: error.message };

    revalidatePath(`/team/${brewery_id}/inventory`);
    return { data };
}

export async function deleteBottles(brewery_id: string, bottle_ids: string[]): Promise<ActionResponse> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Nicht authentifiziert" };

    // Basic validation
    if (!Array.isArray(bottle_ids) || bottle_ids.length === 0) return { error: "Keine Flaschen ausgewählt." };

    const { error } = await supabase
        .from('bottles')
        .delete()
        .in('id', bottle_ids)
        .eq('brewery_id', brewery_id); // Safety check

    if (error) return { error: error.message };

    revalidatePath(`/team/${brewery_id}/inventory`);
    return { data: { success: true } };
}
