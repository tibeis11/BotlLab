"use server";

import { createClient } from "@/lib/supabase-server";
import { getUserPremiumStatus } from "@/lib/premium-checks";
import { type PremiumStatus } from "@/lib/premium-config";

/**
 * Get premium status for currently logged in user
 */
export async function getPremiumStatus(): Promise<PremiumStatus | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return getUserPremiumStatus(user.id);
}

/**
 * Get premium status for a specific user (Server Action)
 */
export async function getSpecificUserPremiumStatus(userId: string): Promise<PremiumStatus | null> {
  return getUserPremiumStatus(userId);
}

/**
 * Get premium status for a brewery (based on Owner's subscription)
 */
export async function getBreweryPremiumStatus(breweryId: string): Promise<PremiumStatus | null> {
    const supabase = await createClient();
    
    // Find Owner
    const { data: members, error } = await supabase
      .from("brewery_members")
      .select("user_id")
      .eq("brewery_id", breweryId)
      .eq("role", "owner")
      .limit(1);

    if (error || !members || members.length === 0) {
        return null;
    }

    return getUserPremiumStatus(members[0].user_id);
}

/**
 * Get custom branding (slogan & logo) for brewery if premium features allow.
 */
export async function getBreweryBranding(
  breweryId: string
): Promise<{ slogan: string | null; logoUrl: string | null; breweryName: string | null; isPremiumBranding: boolean }> {
  const supabase = await createClient();

  // 1. Get Owner Profile & Brewery Details
  const { data: members, error } = await supabase
    .from("brewery_members")
    .select(
      `
      user_id,
      profiles:user_id (
        subscription_tier
      ),
      breweries:brewery_id (
        name,
        logo_url,
        custom_slogan
      )
      `
    )
    .eq("brewery_id", breweryId)
    .eq("role", "owner")
    .limit(1);

  const defaultValue = { slogan: null, logoUrl: null, breweryName: null, isPremiumBranding: false };

  if (error || !members || members.length === 0) {
    if (error) console.error("Error fetching brewery branding:", error);
    return defaultValue;
  }

  const ownerMember = members[0];
  const ownerProfile = ownerMember.profiles as any;
  const brewery = ownerMember.breweries as any;

  if (!ownerProfile) return defaultValue;

  // 2. Check Premium Status of the OWNER
  const premiumStatus = await getUserPremiumStatus(ownerMember.user_id);
  
  if (!premiumStatus) {
    return defaultValue;
  }

  const result = { 
    slogan: null as string | null, 
    logoUrl: null as string | null, 
    breweryName: null as string | null,
    isPremiumBranding: premiumStatus.features.canUseBreweryLogo 
  };

  // 3. Logic: Slogan
  if (premiumStatus.features.canUseCustomSlogan && brewery?.custom_slogan) {
    result.slogan = brewery.custom_slogan;
  }

  // 4. Logic: Logo & Name (Only if brewery-tier or enterprise)
  if (premiumStatus.features.canUseBreweryLogo) {
     let rawLogo = brewery?.logo_url;
     if (rawLogo && rawLogo !== "" && rawLogo !== "null") {
       // If it's already a full URL, use it.
       if (rawLogo.startsWith('http')) {
         result.logoUrl = rawLogo;
       } else {
         // Clean up path if it already contains the bucket name
         const path = rawLogo.startsWith('brewery-assets/') ? rawLogo.replace('brewery-assets/', '') : rawLogo;
         const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
         if (supabaseUrl) {
            result.logoUrl = `${supabaseUrl}/storage/v1/object/public/brewery-assets/${path}`;
         }
       }
     }
     if (brewery?.name) result.breweryName = brewery.name;
  }

  return result;
}

/**
 * Redeem an enterprise access code
 */
export async function redeemCode(code: string): Promise<{ success: boolean; message: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, message: "Nicht angemeldet.", error: "Unauthorized" };

  const { data, error } = await supabase.rpc("redeem_enterprise_code", {
    input_code: code.trim(),
    input_user_id: user.id
  });

  if (error) {
    console.error("Redeem error:", error);
    return { success: false, message: "Server-Fehler beim Einlösen.", error: error.message };
  }

  return data as { success: boolean; message: string; error?: string };
}
