/**
 * Team Knowledge Management API
 * POST /api/botlguide/team-knowledge
 *
 * Handles document uploads, processing triggers, and document deletion
 * for team-specific BotlGuide RAG (Enterprise tier only).
 *
 * Actions:
 *   { action: 'upload',  breweryId, filename, text }     — upload pre-extracted text
 *   { action: 'process', breweryId, documentId }          — trigger edge function processing
 *   { action: 'delete',  breweryId, documentId }          — delete document + chunks
 *   { action: 'list',    breweryId }                      — list all documents for brewery
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getUserPremiumStatus } from '@/lib/premium-checks';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const action = body.action as string;
  const breweryId = body.breweryId as string;

  if (!breweryId) {
    return NextResponse.json({ error: 'breweryId required' }, { status: 400 });
  }

  // ── Tier Gate: Enterprise only ──────────────────────────────────────────
  const premium = await getUserPremiumStatus(user.id);
  if (premium?.tier !== 'enterprise') {
    return NextResponse.json(
      { error: 'Team-Wissen ist nur im Enterprise-Plan verfügbar.', upgrade_required: true },
      { status: 403 },
    );
  }

  // ── Membership check: owner or admin ──────────────────────────────────
  const { data: member } = await supabase
    .from('brewery_members')
    .select('role')
    .eq('brewery_id', breweryId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member || !['owner', 'admin'].includes(member.role ?? '')) {
    return NextResponse.json(
      { error: 'Nur Brewery-Owner oder -Admins können Team-Wissen verwalten.' },
      { status: 403 },
    );
  }

  switch (action) {
    case 'list':
      return handleList(supabase, breweryId);
    case 'upload':
      return handleUpload(supabase, user.id, breweryId, body);
    case 'delete':
      return handleDelete(supabase, breweryId, body.documentId as string);
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleList(supabase: any, breweryId: string) {
  const { data: docs, error } = await supabase
    .from('team_knowledge_base')
    .select('id, filename, file_size_bytes, mime_type, status, chunk_count, error_message, created_at, updated_at')
    .eq('brewery_id', breweryId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documents: docs ?? [] });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleUpload(supabase: any, userId: string, breweryId: string, body: Record<string, unknown>) {
  const filename = body.filename as string;
  const text = body.text as string;

  if (!filename || !text) {
    return NextResponse.json({ error: 'filename and text are required' }, { status: 400 });
  }

  // Check document limit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (supabase as any)
    .from('brewery_settings')
    .select('max_documents')
    .eq('brewery_id', breweryId)
    .maybeSingle();

  const maxDocs = settings?.max_documents ?? 10;

  const { count } = await supabase
    .from('team_knowledge_base')
    .select('id', { count: 'exact', head: true })
    .eq('brewery_id', breweryId);

  if ((count ?? 0) >= maxDocs) {
    return NextResponse.json(
      { error: `Maximum ${maxDocs} Dokumente erreicht. Bitte alte Dokumente löschen.` },
      { status: 409 },
    );
  }

  // Store extracted text as a .txt file in storage
  const storagePath = `${breweryId}/${Date.now()}_${filename.replace(/\.[^.]+$/, '')}.txt`;
  const textBlob = new Blob([text], { type: 'text/plain' });

  const { error: uploadError } = await supabase.storage
    .from('team-documents')
    .upload(storagePath, textBlob, { upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  // Insert metadata record
  const { data: doc, error: insertError } = await supabase
    .from('team_knowledge_base')
    .insert({
      brewery_id: breweryId,
      uploaded_by: userId,
      filename,
      file_path: storagePath,
      file_size_bytes: new Blob([text]).size,
      mime_type: 'text/plain',
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Trigger edge function for chunking + embedding
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    // Fire-and-forget — don't block the response
    fetch(`${supabaseUrl}/functions/v1/botlguide-team-embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        type: 'text',
        document_id: doc.id,
        brewery_id: breweryId,
        text,
      }),
    }).catch((err) => {
      console.error('[team-knowledge] Edge function trigger failed:', err);
    });
  }

  return NextResponse.json({
    success: true,
    documentId: doc.id,
    message: 'Dokument wird verarbeitet. Embeddings werden im Hintergrund generiert.',
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleDelete(supabase: any, breweryId: string, documentId: string) {
  if (!documentId) {
    return NextResponse.json({ error: 'documentId required' }, { status: 400 });
  }

  // Verify document belongs to brewery
  const { data: doc } = await supabase
    .from('team_knowledge_base')
    .select('id, file_path')
    .eq('id', documentId)
    .eq('brewery_id', breweryId)
    .maybeSingle();

  if (!doc) {
    return NextResponse.json({ error: 'Dokument nicht gefunden' }, { status: 404 });
  }

  // Delete chunks first (CASCADE should handle this, but explicit is safer)
  await supabase
    .from('team_knowledge_chunks')
    .delete()
    .eq('document_id', documentId);

  // Delete from storage
  if (doc.file_path) {
    await supabase.storage
      .from('team-documents')
      .remove([doc.file_path]);
  }

  // Delete metadata record
  await supabase
    .from('team_knowledge_base')
    .delete()
    .eq('id', documentId);

  return NextResponse.json({ success: true, deleted: documentId });
}
