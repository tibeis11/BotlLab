"use server";

import { revalidatePath } from "next/cache";
import { QuickSessionCreateSchema, formatZodError } from "@/lib/validations/session-schemas";
import { platoToSG, calculateMeasuredEfficiency } from "@/lib/brewing-calculations";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { TimelineEvent } from "@/lib/types/session-log";

// Helper to get supabase server client
async function getSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

export async function createQuickSession(input: unknown) {
  // 1. Validate Input
  const validation = QuickSessionCreateSchema.safeParse(input);
  if (!validation.success) {
    return { 
      success: false, 
      error: formatZodError(validation.error) 
    };
  }

  const { brewId, breweryId, brewedAt, measurements, batchCode, notes } = validation.data;

  // 2. Get Authenticated User
  const supabase = await getSupabaseServer();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { 
      success: false, 
      error: "Unauthorized. Please log in." 
    };
  }

  // 3. Verify Brewery Access (Explicit Check before RLS)
  const { data: membership, error: membershipError } = await supabase
    .from("brewery_members")
    .select("id")
    .eq("brewery_id", breweryId)
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membership) {
    return { 
      success: false, 
      error: "You do not have access to this brewery." 
    };
  }

  // 4. Fetch Brew (Recipe) Data
  const { data: brew, error: brewError } = await supabase
    .from("brews")
    .select("id, name, data")
    .eq("id", brewId)
    .single();

  if (brewError || !brew) {
    return { 
      success: false, 
      error: "Recipe not found." 
    };
  }

  // 5. Generate Batch Code (if not provided)
  const yearShort = new Date().getFullYear().toString().slice(-2);
  const finalBatchCode = batchCode || `B${yearShort}-${String(Date.now()).slice(-5)}`;

  // 6. Create Initial Timeline
  const initialTimeline: TimelineEvent[] = [
    {
      id: crypto.randomUUID(),
      type: 'STATUS_CHANGE',
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      title: 'Quick Session Created',
      description: `Session created via Quick Mode for recipe: ${brew.name}`,
      createdBy: user.id,
      data: {
        newStatus: 'completed',
        systemMessage: true,
      }
    }
  ];

  // 7. Prepare Measurements (Merge Recipe defaults with overrides)
  const recipeMeasurements = brew.data as any; // JSONB from brews.data

  // Helper: convert Plato to SG if value > 2 (Plato values are typically 8–25)
  const toSG = (val: number | null | undefined): number | null => {
    if (val == null) return null;
    return val > 2 ? platoToSG(val) : val;
  };

  const rawOG = measurements?.og ?? (recipeMeasurements?.og ? parseFloat(String(recipeMeasurements.og)) : null);
  const rawFG = measurements?.fg ?? (recipeMeasurements?.fg ? parseFloat(String(recipeMeasurements.fg)) : null);
  const rawVolume = measurements?.volume ?? (recipeMeasurements?.batchSize ? parseFloat(String(recipeMeasurements.batchSize)) : null);
  const rawABV = measurements?.abv ?? (recipeMeasurements?.abv ? parseFloat(String(recipeMeasurements.abv)) : null);

  const measuredOG = toSG(rawOG);
  const measuredFG = toSG(rawFG);

  // Calculate SHA if OG + volume + malts are available
  const malts = recipeMeasurements?.malts;
  let measuredEfficiency: number | null = null;
  if (measuredOG && rawVolume && Array.isArray(malts) && malts.length > 0) {
    const sha = calculateMeasuredEfficiency(measuredOG, rawVolume, malts);
    if (sha > 0) measuredEfficiency = sha;
  }

  const finalMeasurements = {
    og: measuredOG,
    fg: measuredFG,
    volume: rawVolume,
    abv: rawABV,
  };

  // 8. Insert Session
  // Quick sessions are immediately ARCHIVED so they feed into session_stats aggregation
  const { data: session, error: insertError } = await supabase
    .from("brewing_sessions")
    .insert({
      brew_id: brewId,
      brewery_id: breweryId,
      session_type: 'quick',
      phase: 'completed',
      status: 'ARCHIVED',
      brewed_at: brewedAt || new Date().toISOString().split('T')[0],
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      batch_code: finalBatchCode,
      timeline: initialTimeline,
      measurements: finalMeasurements,
      measured_og: measuredOG,
      measured_fg: measuredFG,
      measured_abv: rawABV,
      measured_efficiency: measuredEfficiency,
      measure_volume: rawVolume,
      notes: notes || null,
    })
    .select()
    .single();

  if (insertError || !session) {
    console.error("Quick Session Insert Error:", insertError);
    return { 
      success: false, 
      error: "Failed to create session. Please try again." 
    };
  }

  // 9. Revalidate Cache & Return
  revalidatePath(`/team/${breweryId}/sessions`);
  revalidatePath(`/team/${breweryId}/dashboard`);

  // 10. Analytics
  try {
    const { trackEvent } = await import('@/lib/actions/analytics-actions');
    await trackEvent({
        event_type: 'create_session',
        category: 'engagement',
        payload: {
            brewery_id: breweryId,
            brew_id: brewId,
            session_type: 'quick'
        }
    });
  } catch(e) {
      console.error('Analytics tracking failed', e);
  }

  return { 
    success: true, 
    sessionId: session.id 
  };
}
