'use server';

import { createClient, createAdminClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { isProfane, cleanText } from '@/lib/profanity';

// ─────────────────────────────────────────────────────────────────────────────
// Internal: Find or create the canonical brew_comments thread for a brew.
//           Uses service_role (createAdminClient) to bypass RLS — only the
//           server can create system threads with thread_type = 'brew_comments'.
// ─────────────────────────────────────────────────────────────────────────────
async function getOrCreateBrewCommentsThread(
  brewId: string,
  brewName: string,
  userId: string,
): Promise<string | null> {
  const admin = createAdminClient();

  // 1. Check for existing thread (UNIQUE INDEX guarantees at most one)
  const { data: existing } = await admin
    .from('forum_threads')
    .select('id')
    .eq('brew_id', brewId)
    .eq('thread_type', 'brew_comments')
    .maybeSingle();

  if (existing?.id) return existing.id;

  // 2. Resolve the rezept-kommentare category
  const { data: category } = await admin
    .from('forum_categories')
    .select('id')
    .eq('slug', 'rezept-kommentare')
    .single();

  if (!category) {
    console.error('[brew-comments] Category "rezept-kommentare" not found. Was migration applied?');
    return null;
  }

  // 3. Create system thread — service role bypasses the RLS INSERT policy
  const { data: thread, error } = await admin
    .from('forum_threads')
    .insert({
      category_id: category.id,
      author_id: userId,
      brew_id: brewId,
      thread_type: 'brew_comments',
      title: `Kommentare: ${brewName}`,
      content: '', // OP is empty — the UI uses individual posts
    })
    .select('id')
    .single();

  if (error) {
    // If a concurrent request already created the thread, retry lookup
    if (error.code === '23505') {
      const { data: retry } = await admin
        .from('forum_threads')
        .select('id')
        .eq('brew_id', brewId)
        .eq('thread_type', 'brew_comments')
        .single();
      return retry?.id ?? null;
    }
    console.error('[brew-comments] Failed to create thread:', error);
    return null;
  }

  return thread?.id ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: Load comments for a brew
//         Returns all top-level posts + 1 level of replies, newest-first.
// ─────────────────────────────────────────────────────────────────────────────
export async function getBrewComments(brewId: string): Promise<{
  comments: any[];
  threadId: string | null;
}> {
  const supabase = await createClient();

  const { data: thread } = await supabase
    .from('forum_threads')
    .select('id')
    .eq('brew_id', brewId)
    .eq('thread_type', 'brew_comments')
    .maybeSingle();

  if (!thread?.id) return { comments: [], threadId: null };

  const { data: posts } = await supabase
    .from('forum_posts')
    .select(`
      id, content, created_at, parent_id,
      author:profiles(id, display_name, logo_url, tier)
    `)
    .eq('thread_id', thread.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(100);

  return { comments: posts ?? [], threadId: thread.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: Post a comment (or reply) to a brew
// ─────────────────────────────────────────────────────────────────────────────
export async function postBrewComment(
  brewId: string,
  brewName: string,
  content: string,
  parentCommentId?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Nicht eingeloggt' };

  const trimmed = content.trim();
  if (trimmed.length < 2) return { success: false, error: 'Kommentar zu kurz (min. 2 Zeichen)' };
  if (trimmed.length > 1000) return { success: false, error: 'Kommentar zu lang (max. 1000 Zeichen)' };

  // Profanity filter
  const cleaned = isProfane(trimmed) ? cleanText(trimmed) : trimmed;

  const threadId = await getOrCreateBrewCommentsThread(brewId, brewName, user.id);
  if (!threadId) return { success: false, error: 'Thread konnte nicht erstellt werden' };

  // Use regular client for the post — user is the author, RLS allows it
  const { error } = await supabase
    .from('forum_posts')
    .insert({
      thread_id: threadId,
      author_id: user.id,
      content: cleaned,
      parent_id: parentCommentId ?? null,
    });

  if (error) {
    console.error('[brew-comments] Failed to post comment:', error);
    return { success: false, error: 'Kommentar konnte nicht gespeichert werden' };
  }

  revalidatePath(`/brew/${brewId}`);
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: Get user-initiated forum discussions for a brew
//         (thread_type = 'discussion' with brew_id = brewId)
// ─────────────────────────────────────────────────────────────────────────────
export async function getBrewDiscussionThreads(brewId: string): Promise<any[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('forum_threads')
    .select(`
      id, title, reply_count, created_at,
      category:forum_categories(title, slug)
    `)
    .eq('brew_id', brewId)
    .eq('thread_type', 'discussion')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5);

  return data ?? [];
}
