// @ts-nocheck
// Deno Edge Function — URL imports are intentional and valid in Deno runtime.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * BotlGuide Team Embed — Supabase Edge Function
 *
 * Processes uploaded SOP/manual documents for team-specific BotlGuide RAG.
 *
 * Flow:
 *   1. Client uploads PDF to `team-documents` bucket + inserts metadata
 *      into `team_knowledge_base` with status='pending'
 *   2. Client POSTs to this function with { document_id, brewery_id }
 *   3. Function downloads the file, extracts text (plain text or PDF via
 *      a simple text layer approach), chunks it, generates Gemini
 *      embeddings, stores in `team_knowledge_chunks`
 *   4. Updates document status to 'ready' (or 'error')
 *
 * Alternative: client can send pre-extracted text directly:
 *   { type: 'text', document_id, brewery_id, text, filename }
 *
 * POST body variants:
 *   { type: 'process',  document_id: string, brewery_id: string }
 *   { type: 'text',     document_id: string, brewery_id: string, text: string }
 *   { type: 'delete',   document_id: string }
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001'
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

// Chunking config
const CHUNK_SIZE = 500        // target chars per chunk
const CHUNK_OVERLAP = 100     // overlap between consecutive chunks
const MAX_CHUNKS = 200        // safety limit per document
const EMBED_DELAY_MS = 120    // rate-limit delay between Gemini calls

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? Deno.env.get('GOOGLE_AI_API_KEY') ?? ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!geminiApiKey) throw new Error('GEMINI_API_KEY not configured')

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const body = await req.json()

    if (body.type === 'process') {
      const result = await processDocument(supabase, geminiApiKey, body.document_id, body.brewery_id)
      return json({ success: true, ...result })
    }

    if (body.type === 'text') {
      const result = await processText(
        supabase, geminiApiKey, body.document_id, body.brewery_id, body.text
      )
      return json({ success: true, ...result })
    }

    if (body.type === 'delete') {
      await deleteDocumentChunks(supabase, body.document_id)
      return json({ success: true, deleted: body.document_id })
    }

    throw new Error(`Unknown type: ${body.type}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[botlguide-team-embed] error:', msg)
    return json({ error: msg }, 500)
  }
})

// ─── Process Document (download from storage + extract text) ───────────────

async function processDocument(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  documentId: string,
  breweryId: string,
) {
  // Mark as processing
  await supabase
    .from('team_knowledge_base')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', documentId)

  try {
    // Fetch document metadata
    const { data: doc, error: docErr } = await supabase
      .from('team_knowledge_base')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docErr || !doc) throw new Error(`Document not found: ${documentId}`)

    // Download file from storage
    const { data: fileData, error: dlErr } = await supabase.storage
      .from('team-documents')
      .download(doc.file_path)

    if (dlErr || !fileData) throw new Error(`Download failed: ${dlErr?.message ?? 'no data'}`)

    // Extract text based on mime type
    let text = ''
    if (doc.mime_type === 'text/plain' || doc.mime_type === 'text/markdown') {
      text = await fileData.text()
    } else if (doc.mime_type === 'application/pdf') {
      // For PDFs, we attempt a simple text layer extraction.
      // Complex PDFs with scanned images won't work here - those need OCR.
      // The client-side extraction via pdf.js is more reliable;
      // use type='text' endpoint for those cases.
      text = await extractPdfText(fileData)
    } else {
      // Try to read as plain text for other formats (e.g. .md, .txt, .csv)
      text = await fileData.text()
    }

    if (!text.trim()) {
      throw new Error('Kein Text extrahiert. Bei gescannten PDFs bitte den Text manuell eingeben.')
    }

    // Chunk, embed, store
    return await processText(supabase, apiKey, documentId, breweryId, text)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabase
      .from('team_knowledge_base')
      .update({ status: 'error', error_message: msg, updated_at: new Date().toISOString() })
      .eq('id', documentId)
    throw err
  }
}

// ─── Process Pre-Extracted Text ────────────────────────────────────────────

async function processText(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  documentId: string,
  breweryId: string,
  text: string,
) {
  // Delete old chunks for this document (re-processing)
  await supabase
    .from('team_knowledge_chunks')
    .delete()
    .eq('document_id', documentId)

  // Chunk the text
  const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP)

  if (chunks.length > MAX_CHUNKS) {
    throw new Error(
      `Dokument zu lang: ${chunks.length} Chunks (max. ${MAX_CHUNKS}). ` +
      'Bitte in kleinere Dokumente aufteilen.'
    )
  }

  // Generate embeddings and store chunks
  let stored = 0
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const embedding = await generateEmbedding(apiKey, chunk)

    const { error: insertErr } = await supabase
      .from('team_knowledge_chunks')
      .insert({
        document_id: documentId,
        brewery_id: breweryId,
        chunk_index: i,
        content: chunk,
        embedding: JSON.stringify(embedding),
        token_count: estimateTokens(chunk),
        metadata: { chunkOf: chunks.length },
      })

    if (insertErr) {
      console.error(`[team-embed] chunk ${i} insert failed:`, insertErr.message)
    } else {
      stored++
    }

    // Rate-limit delay
    if (i < chunks.length - 1) {
      await sleep(EMBED_DELAY_MS)
    }
  }

  // Update document status
  await supabase
    .from('team_knowledge_base')
    .update({
      status: 'ready',
      chunk_count: stored,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)

  return { document_id: documentId, chunks_total: chunks.length, chunks_stored: stored }
}

// ─── Delete Document Chunks ────────────────────────────────────────────────

async function deleteDocumentChunks(
  supabase: ReturnType<typeof createClient>,
  documentId: string,
) {
  await supabase
    .from('team_knowledge_chunks')
    .delete()
    .eq('document_id', documentId)
}

// ─── Text Chunking (sliding window) ───────────────────────────────────────

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  if (cleaned.length <= chunkSize) return [cleaned]

  const chunks: string[] = []
  let start = 0

  while (start < cleaned.length) {
    let end = start + chunkSize

    // Try to break at a paragraph or sentence boundary
    if (end < cleaned.length) {
      const slice = cleaned.slice(start, end + 50) // look-ahead
      const paraBreak = slice.lastIndexOf('\n\n')
      const sentenceBreak = slice.lastIndexOf('. ')
      const lineBreak = slice.lastIndexOf('\n')

      if (paraBreak > chunkSize * 0.6) {
        end = start + paraBreak + 2
      } else if (sentenceBreak > chunkSize * 0.6) {
        end = start + sentenceBreak + 2
      } else if (lineBreak > chunkSize * 0.6) {
        end = start + lineBreak + 1
      }
    }

    end = Math.min(end, cleaned.length)
    const chunk = cleaned.slice(start, end).trim()
    if (chunk.length > 0) {
      chunks.push(chunk)
    }

    // Advance with overlap
    start = end - overlap
    if (start >= cleaned.length) break
  }

  return chunks
}

// ─── PDF Text Extraction (simple) ──────────────────────────────────────────
// Attempts to extract text content from PDF by reading the text stream objects.
// This is a best-effort approach for PDFs with text layers.
// For scanned/image PDFs, clients should use browser-side pdf.js extraction.

async function extractPdfText(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const raw = new TextDecoder('latin1').decode(bytes)

  // Extract text between BT ... ET blocks (PDF text objects)
  const textBlocks: string[] = []
  const btEtRegex = /BT\s([\s\S]*?)\sET/g
  let match

  while ((match = btEtRegex.exec(raw)) !== null) {
    const block = match[1]
    // Extract Tj and TJ operator content
    const tjRegex = /\(([^)]*)\)\s*Tj/g
    let tj
    while ((tj = tjRegex.exec(block)) !== null) {
      textBlocks.push(tj[1])
    }
    // TJ arrays: [(text) num (text) ...]
    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g
    let tja
    while ((tja = tjArrayRegex.exec(block)) !== null) {
      const parts = tja[1].match(/\(([^)]*)\)/g)
      if (parts) {
        textBlocks.push(parts.map(p => p.slice(1, -1)).join(''))
      }
    }
  }

  // Decode common PDF escape sequences
  const text = textBlocks
    .join(' ')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\s{3,}/g, '\n\n')
    .trim()

  return text
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
      taskType: 'RETRIEVAL_DOCUMENT',
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

// ─── Helpers ───────────────────────────────────────────────────────────────

function estimateTokens(text: string): number {
  // Rough heuristic: ~4 chars per token for German text
  return Math.ceil(text.length / 4)
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
