'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from "next/cache";

// Helper to get supabase server client
async function getSupabaseServer() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export async function getLikeStatus(brewId: string) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Get total count from BREWS table (Performant & Private RLS safe)
  const { data: brew, error } = await supabase
    .from('brews')
    .select('likes_count')
    .eq('id', brewId)
    .single();

  if (error) {
    console.error("Error fetching brew like count:", error);
    // Continue with 0, don't break
  }
  
  const count = brew?.likes_count ?? 0;

  // 2. Check if user liked
  let isLiked = false;
  if (user) {
    const { data } = await supabase
      .from('likes')
      .select('id')
      .eq('brew_id', brewId)
      .eq('user_id', user.id)
      .single();
    isLiked = !!data;
  }

  return { count: count || 0, isLiked };
}

export async function toggleBrewLike(brewId: string) {
  const supabase = await getSupabaseServer();
  
  // Try getUser first (secure)
  let { data: { user }, error: authError } = await supabase.auth.getUser();

  // Debugging: Log auth state if failed
  if (authError || !user) {
    console.warn("toggleBrewLike: getUser failed or no user. Error:", authError?.message);
    // Fallback? Usually getSession is not reliable in server actions for security, 
    // but useful for debugging if cookie exists but is stale.
  }

  if (!user) {
    throw new Error("User must be logged in (Auth Check Failed)");
  }

  // Check existence

  const { data: existingLike } = await supabase
    .from('likes')
    .select('id')
    .eq('brew_id', brewId)
    .eq('user_id', user.id)
    .single();

  if (existingLike) {
    await supabase.from('likes').delete().eq('id', existingLike.id);
  } else {
    await supabase.from('likes').insert({
      user_id: user.id,
      brew_id: brewId
    });
  }

  revalidatePath('/discover');
  revalidatePath(`/brew/${brewId}`);
  // Add dashboard path when it exists
  revalidatePath('/dashboard/favorites');
}

