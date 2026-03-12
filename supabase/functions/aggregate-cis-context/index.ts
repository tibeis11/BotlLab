// @ts-nocheck
// Deno Edge Function — URL imports are intentional and valid in Deno runtime.
// This file is excluded from the Next.js tsconfig but VS Code may still flag
// URL imports when the file is open. @ts-nocheck suppresses those false positives.
//
// aggregate-cis-context
// ─────────────────────
// Nightly job (03:00 UTC) that refreshes `brews.typical_scan_hour` and
// `brews.typical_temperature` from verified scans of the last 90 days.
//
// Why MODE() for hour?  AVG() is broken for cyclic data:
//   AVG({23, 1}) = 12  — wrong.  MODE({23, 23, 1}) = 23 — correct.
//
// Only "verified" scans are used as the training signal:
//   converted_to_rating = true   OR   confirmed_drinking = true
// This avoids polluting the model with bot / fridge-surf scans.

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')            ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // One UPDATE statement does the full job.
    // Both sub-selects scan only the verified slice of bottle_scans,
    // filtered to 90 days — the index on (brew_id, created_at) keeps it fast.
    //
    // Notes:
    //  • local_time   — client-sent timestamp; EXTRACT(HOUR …) returns local hour
    //  • weather_temp_c — actual column name in bottle_scans (not `temperature`)
    //  • NULLIF guard: if local_time is NULL we fall back to NULL (no data)
    const { error } = await supabase.rpc('aggregate_cis_brew_context')

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err) {
    console.error('[aggregate-cis-context] error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
