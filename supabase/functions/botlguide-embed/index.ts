// @ts-nocheck
// Deno Edge Function — URL imports are intentional and valid in Deno runtime.
// @ts-nocheck suppresses false-positive VS Code warnings.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * BotlGuide Embed — Supabase Edge Function
 *
 * Generates vector embeddings via Gemini text-embedding-004 and upserts them
 * into the `botlguide_embeddings` table.
 *
 * Invoked:
 *  - On recipe save/update via next.js API route (type: 'user_recipe')
 *  - One-time BJCP seed pass (type: 'bjcp_seed') from seed script
 *
 * POST body:
 *   { type: 'user_recipe', brew_id: string, user_id: string, brewery_id?: string }
 *   { type: 'bjcp_seed',   styles: Array<{ code, name, nameDe, content, metadata }> }
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001'
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

interface EmbedRequest {
  type: 'user_recipe' | 'bjcp_seed' | 'bjcp_style'
  // user_recipe
  brew_id?: string
  user_id?: string
  brewery_id?: string
  // bjcp_seed (batch)
  styles?: Array<{
    code: string
    name: string
    nameDe: string
    content: string
    metadata: Record<string, unknown>
  }>
  // bjcp_style (single)
  style?: {
    code: string
    name: string
    nameDe: string
    content: string
    metadata: Record<string, unknown>
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // @ts-ignore
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? ''
    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    // @ts-ignore
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!geminiApiKey) throw new Error('GEMINI_API_KEY not configured')

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const body: EmbedRequest = await req.json()

    if (body.type === 'user_recipe') {
      const result = await embedUserRecipe(supabase, geminiApiKey, body)
      return json({ success: true, ...result })
    }

    if (body.type === 'bjcp_seed' && body.styles?.length) {
      const results = await embedBjcpBatch(supabase, geminiApiKey, body.styles)
      return json({ success: true, processed: results })
    }

    if (body.type === 'bjcp_style' && body.style) {
      const result = await embedBjcpSingle(supabase, geminiApiKey, body.style)
      return json({ success: true, ...result })
    }

    throw new Error(`Unknown type: ${body.type}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[botlguide-embed] error:', msg)
    return json({ error: msg }, 400)
  }
})

// ─── User Recipe Embedding ─────────────────────────────────────────────────

async function embedUserRecipe(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  body: EmbedRequest,
) {
  const { data: brew, error } = await supabase
    .from('brews')
    .select('id, name, style, brew_type, og, fg, abv, ibu, batch_size_liters, data')
    .eq('id', body.brew_id)
    .single()

  if (error || !brew) throw new Error(`Brew not found: ${body.brew_id}`)

  const content = buildRecipeEmbeddingText(brew)
  const embedding = await generateEmbedding(apiKey, content)

  const metadata = {
    name: brew.name,
    style: brew.style,
    brewType: brew.brew_type,
    og: brew.og,
    fg: brew.fg,
    abv: brew.abv,
    ibu: brew.ibu,
    batchSizeL: brew.batch_size_liters,
  }

  const { error: upsertError } = await supabase
    .from('botlguide_embeddings')
    .upsert(
      {
        source_type: 'user_recipe',
        source_id: brew.id,
        user_id: body.user_id ?? null,
        brewery_id: body.brewery_id ?? null,
        content,
        embedding: JSON.stringify(embedding),
        metadata,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'source_type,source_id,user_id' },
    )

  if (upsertError) throw new Error(`Upsert failed: ${upsertError.message}`)

  return { brew_id: brew.id, content_length: content.length }
}

// ─── BJCP Batch Embedding ──────────────────────────────────────────────────

async function embedBjcpBatch(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  styles: NonNullable<EmbedRequest['styles']>,
) {
  const results: Array<{ code: string; ok: boolean; error?: string }> = []

  for (const style of styles) {
    try {
      await embedBjcpSingle(supabase, apiKey, style)
      results.push({ code: style.code, ok: true })
      // Small delay to avoid Gemini rate limits
      await sleep(120)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ code: style.code, ok: false, error: msg })
      console.error(`[bjcp-embed] ${style.code} failed:`, msg)
    }
  }

  return results
}

async function embedBjcpSingle(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  style: NonNullable<EmbedRequest['style']>,
) {
  const embedding = await generateEmbedding(apiKey, style.content)

  const { error } = await supabase
    .from('botlguide_embeddings')
    .upsert(
      {
        source_type: 'bjcp_style',
        source_id: style.code,
        user_id: null,
        brewery_id: null,
        content: style.content,
        embedding: JSON.stringify(embedding),
        metadata: style.metadata,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'source_type,source_id,user_id' },
    )

  if (error) throw new Error(`Upsert ${style.code}: ${error.message}`)
  return { code: style.code, content_length: style.content.length }
}

// ─── Gemini Embedding API ──────────────────────────────────────────────────

async function generateEmbedding(apiKey: string, text: string): Promise<number[]> {
  const url = `${GEMINI_API_BASE}/models/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${GEMINI_EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
      taskType: 'SEMANTIC_SIMILARITY',
      outputDimensionality: 768,
    }),
  })

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`Gemini embedding API error ${response.status}: ${errBody}`)
  }

  const data = await response.json()
  const values = data?.embedding?.values

  if (!Array.isArray(values) || values.length !== 768) {
    throw new Error(`Unexpected embedding format: ${JSON.stringify(data).slice(0, 200)}`)
  }

  return values
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function buildRecipeEmbeddingText(brew: {
  name: string
  style?: string
  brew_type?: string
  og?: number
  fg?: number
  abv?: number
  ibu?: number
  batch_size_liters?: number
  data?: Record<string, unknown>
}): string {
  const lines: string[] = [
    `Rezept: ${brew.name || 'Unbekannt'}`,
    brew.style ? `Bierstil: ${brew.style}` : '',
    brew.brew_type ? `Typ: ${brew.brew_type}` : '',
    brew.og ? `OG: ${brew.og}` : '',
    brew.fg ? `FG: ${brew.fg}` : '',
    brew.abv ? `ABV: ${brew.abv}%` : '',
    brew.ibu ? `IBU: ${brew.ibu}` : '',
    brew.batch_size_liters ? `Charge: ${brew.batch_size_liters} Liter` : '',
  ]

  const data = brew.data as Record<string, unknown> | null
  if (data) {
    const malts = data.malts as Array<{ name?: string; amount?: number; unit?: string }> | undefined
    if (malts?.length) {
      lines.push(`Malze: ${malts.map(m => `${m.amount}${m.unit ?? 'kg'} ${m.name}`).join(', ')}`)
    }
    const hops = data.hops as Array<{ name?: string; amount?: number; unit?: string }> | undefined
    if (hops?.length) {
      lines.push(`Hopfen: ${hops.map(h => `${h.amount}${h.unit ?? 'g'} ${h.name}`).join(', ')}`)
    }
  }

  return lines.filter(Boolean).join('. ')
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
