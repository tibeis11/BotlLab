'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { cleanText } from '@/lib/profanity';
import { checkAndGrantAchievements } from '@/lib/achievements';
import { createNotification, notifyNewForumReply } from './notification-actions';
import { sendForumReplyEmail } from '@/lib/email';
import { getThreadSubscriberIds } from '@/lib/forum-service';
import { FORUM_TAGS } from '@/lib/forum-constants';

const threadSchema = z.object({
  title: z.string().min(5, "Titel muss mindestens 5 Zeichen lang sein").max(100),
  categoryId: z.string().uuid("Ungültige Kategorie"),
  content: z.string().min(10, "Inhalt muss mindestens 10 Zeichen lang sein"),
  brewId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).max(3, 'Maximal 3 Tags').default([])
});

const postSchema = z.object({
    content: z.string().min(2, "Antwort ist zu kurz"),
    threadId: z.string().uuid(),
    replyToId: z.string().uuid().optional()
});

async function getSupabase() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                     try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch { }
                }
            }
        }
    );
}

export type ActionState = {
    error?: string | Record<string, string[]>;
    success?: boolean;
    message?: string;
};

export async function createThread(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const supabase = await getSupabase();
    
    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Bitte logge dich ein, um ein Thema zu erstellen.' };
    }

    // Rate Limiting: max 3 threads per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentThreadCount } = await supabase
        .from('forum_threads')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', user.id)
        .gte('created_at', oneHourAgo);
    if ((recentThreadCount ?? 0) >= 3) {
        return { error: 'Du kannst maximal 3 Themen pro Stunde erstellen. Bitte warte etwas.' };
    }

    // Validation
    const rawBrewId = formData.get('brewId');
    const processedBrewId = (typeof rawBrewId === 'string' && rawBrewId.length > 0) ? rawBrewId : null;

    // Parse tags from comma-separated hidden input
    const rawTags = formData.get('tags');
    const parsedTags = (typeof rawTags === 'string' && rawTags.length > 0)
        ? rawTags.split(',').map(t => t.trim()).filter(Boolean)
        : [];

    const validatedFields = threadSchema.safeParse({
        title: formData.get('title'),
        categoryId: formData.get('categoryId'),
        content: formData.get('content'),
        // Handle empty string for optional brewId
        brewId: processedBrewId,
        tags: parsedTags
    });

    if (!validatedFields.success) {
         // Flatten Zod errors
         const fieldErrors = validatedFields.error.flatten().fieldErrors;
         // Convert to string array or just keep object, simpler to return first error string for generic error field
         return { error: 'Bitte überprüfe deine Eingaben.', message: 'Validierungsfehler' };
    }

    const { title, categoryId, content, brewId, tags } = validatedFields.data;

    // Profanity Check & Cleaning
    const cleanTitle = cleanText(title);
    const cleanContent = cleanText(content);

    // DB Insert
    const { data, error } = await supabase
        .from('forum_threads')
        .insert({
            title: cleanTitle,
            category_id: categoryId,
            content: cleanContent,
            author_id: user.id,
            brew_id: brewId,
            tags
        })
        .select('*, category:forum_categories(slug)')
        .single();

    if (error) {
        return { error: 'Datenbank Fehler: ' + error.message };
    }

    // Optional poll
    try {
        const pollQuestion = formData.get('pollQuestion');
        const pollOptionsRaw = formData.get('pollOptions');
        const pollMultiple = formData.get('pollMultiple') === 'true';

        if (typeof pollQuestion === 'string' && pollQuestion.trim().length >= 3 &&
            typeof pollOptionsRaw === 'string' && pollOptionsRaw.trim().length > 0) {
            const options = pollOptionsRaw.split('||').map(o => o.trim()).filter(o => o.length > 0);
            if (options.length >= 2) {
                const { data: pollData } = await supabase
                    .from('forum_polls')
                    .insert({ thread_id: data.id, question: pollQuestion.trim(), multiple_choice: pollMultiple })
                    .select('id')
                    .single();
                if (pollData) {
                    await supabase.from('forum_poll_options').insert(
                        options.map((label, i) => ({ poll_id: pollData.id, label, sort_order: i }))
                    );
                }
            }
        }
    } catch (e) { /* non-critical */ }
    
    // Check Achievements async (fire and forget)
    checkAndGrantAchievements(user.id).catch(console.error);

    // Feed Push (to all squads)
    try {
        const { data: memberships } = await supabase
            .from('brewery_members')
            .select('brewery_id')
            .eq('user_id', user.id);
        
        if (memberships && memberships.length > 0) {
            const feedInserts = memberships.map(m => ({
                brewery_id: m.brewery_id,
                user_id: user.id,
                type: 'FORUM_THREAD_CREATED',
                content: {
                    title: cleanTitle,
                    thread_id: data.id,
                    message: `hat eine neue Diskussion gestartet: "${cleanTitle}"`
                }
            }));
             await supabase.from('brewery_feed').insert(feedInserts);
        }
    } catch (e) {
        console.error("Feed Push Error", e);
    }

    revalidatePath('/forum');
    const categorySlug = (data as any).category?.slug;
    if (categorySlug) revalidatePath(`/forum/${categorySlug}`);

    // Auto-subscribe thread author
    try {
        await supabase.from('forum_subscriptions').upsert(
            { user_id: user.id, thread_id: data.id },
            { onConflict: 'user_id,thread_id', ignoreDuplicates: true }
        );
    } catch { /* non-critical */ }

    // Redirect to new thread (throws error in Next.js actions, so must be last)
    redirect(`/forum/thread/${data.id}`);
}

export async function createPost(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const supabase = await getSupabase();
    
    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Nicht eingeloggt' };
    }

    const validatedFields = postSchema.safeParse({
        content: formData.get('content'),
        threadId: formData.get('threadId'),
        replyToId: formData.get('replyToId') || undefined
    });

    if (!validatedFields.success) {
         return { error: 'Antwort zu kurz oder ungültig.' };
    }

    const { content, threadId, replyToId } = validatedFields.data;
    const cleanContent = cleanText(content);
    // Rate Limiting: max 20 posts per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentPostCount } = await supabase
        .from('forum_posts')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', user.id)
        .gte('created_at', oneHourAgo);
    if ((recentPostCount ?? 0) >= 20) {
        return { error: 'Du kannst maximal 20 Antworten pro Stunde schreiben. Bitte warte etwas.' };
    }
    // 1. Fetch thread info (also checks lock status)
    const { data: thread } = await supabase
        .from('forum_threads')
        .select('author_id, title, is_locked')
        .eq('id', threadId)
        .single();

    if (!thread) {
        return { error: 'Thread nicht gefunden.' };
    }

    if (thread.is_locked) {
        return { error: 'Dieser Thread ist gesperrt und akzeptiert keine neuen Antworten.' };
    }

    // DB Insert Post
    const { data: postData, error } = await supabase
        .from('forum_posts')
        .insert({
            content: cleanContent,
            thread_id: threadId,
            author_id: user.id,
            parent_id: replyToId
        })
        .select()
        .single();

    if (error) {
        return { error: 'Fehler beim Speichern: ' + error.message };
    }

    // Auto-subscribe the poster to this thread
    try {
        await supabase.from('forum_subscriptions').upsert(
            { user_id: user.id, thread_id: threadId },
            { onConflict: 'user_id,thread_id', ignoreDuplicates: true }
        );
    } catch { /* non-critical */ }

    // Handle Notifications
    const messagePreview = cleanContent.substring(0, 50) + (cleanContent.length > 50 ? '...' : '');
    const notifData = { thread_id: threadId, post_id: postData.id, thread_title: thread.title, message_preview: messagePreview };

    try {
        // Parse all @DisplayName mentions from the post content
        const mentionMatches = [...cleanContent.matchAll(/@([\w\u00C0-\u017E\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df]+)/g)]
            .map(m => m[1]);

        const mentionedUserIds = new Set<string>();

        if (mentionMatches.length > 0) {
            const { data: mentionedProfiles } = await supabase
                .from('profiles')
                .select('id, display_name')
                .in('display_name', mentionMatches);

            for (const profile of mentionedProfiles ?? []) {
                if (profile.id === user.id) continue; // don't notify yourself
                mentionedUserIds.add(profile.id);
                await createNotification({
                    userId: profile.id,
                    actorId: user.id,
                    type: 'forum_mention',
                    data: notifData
                });
            }
        }

        // Notify thread author with forum_reply (if not self and not already mentioned)
        if (thread && thread.author_id !== user.id && !mentionedUserIds.has(thread.author_id)) {
            await createNotification({
                userId: thread.author_id,
                actorId: user.id,
                type: 'forum_reply',
                data: notifData
            });
            // Email notification (respects preferences)
            await notifyNewForumReply(threadId, user.user_metadata?.display_name || 'Ein Nutzer', messagePreview);
        }

        // Notify all other subscribers (not self, not thread author already notified)
        try {
            const subscriberIds = await getThreadSubscriberIds(threadId);
            const alreadyNotified = new Set([user.id, thread?.author_id ?? '', ...mentionedUserIds]);
            for (const subId of subscriberIds) {
                if (alreadyNotified.has(subId)) continue;
                await createNotification({
                    userId: subId,
                    actorId: user.id,
                    type: 'forum_reply',
                    data: notifData
                });
            }
        } catch { /* non-critical */ }
    } catch (e) {
        console.error("Notification Error:", e);
    }

    // Check Achievements async
    checkAndGrantAchievements(user.id).catch(console.error);

    revalidatePath(`/forum/thread/${threadId}`);
    // return a timestamp to ensure state update even if success was already true
    return { success: true, message: Date.now().toString() };
}

const reportSchema = z.object({
    targetId: z.string().uuid(),
    targetType: z.enum(['forum_thread', 'forum_post']),
    reason: z.enum(['spam', 'nsfw', 'harassment', 'copyright', 'other']),
    details: z.string().optional()
});

export async function reportContent(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const supabase = await getSupabase();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Bitte einloggen.' };
    }

    const validatedFields = reportSchema.safeParse({
        targetId: formData.get('targetId'),
        targetType: formData.get('targetType'),
        reason: formData.get('reason'),
        details: formData.get('details')
    });

    if (!validatedFields.success) {
        return { error: 'Ungültige Anfrage.' };
    }

    const { targetId, targetType, reason, details } = validatedFields.data;

    const { error } = await supabase
        .from('reports') 
        .insert({
            target_id: targetId,
            target_type: targetType, 
            reporter_id: user.id,
            reason: reason,
            details: details,
            status: 'open'
        });
    
    if (error) {
        return { error: 'Fehler beim Melden: ' + error.message };
    }

    return { success: true, message: 'Gemeldet. Danke!' };
}

export async function checkThreadForBrew(brewId: string) {
    const supabase = await getSupabase();
    const { data } = await supabase
        .from('forum_threads')
        .select('id, title')
        .eq('brew_id', brewId)
        .maybeSingle();
    
    return data;
}

export async function markThreadAsSolved(threadId: string, solved: boolean): Promise<ActionState> {
    const supabase = await getSupabase();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Nicht eingeloggt.' };

    // Only the thread author may mark/unmark as solved
    const { data: thread } = await supabase
        .from('forum_threads')
        .select('author_id')
        .eq('id', threadId)
        .single();

    if (!thread) return { error: 'Thread nicht gefunden.' };
    if (thread.author_id !== user.id) return { error: 'Nur der Ersteller kann den Thread als Gelöst markieren.' };

    const { error } = await supabase
        .from('forum_threads')
        .update({ is_solved: solved })
        .eq('id', threadId);

    if (error) return { error: 'Fehler: ' + error.message };

    revalidatePath(`/forum/thread/${threadId}`);
    return { success: true };
}

export async function toggleForumVote(
    targetId: string,
    targetType: 'thread' | 'post',
    reactionType: 'prost' | 'hilfreich' | 'feuer'
): Promise<{ action: 'added' | 'removed' } | { error: string }> {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Nicht angemeldet.' };

    const { data: existing } = await supabase
        .from('forum_votes')
        .select('id')
        .eq('target_id', targetId)
        .eq('user_id', user.id)
        .eq('reaction_type', reactionType)
        .maybeSingle();

    if (existing) {
        await supabase.from('forum_votes').delete().eq('id', existing.id);
        return { action: 'removed' };
    } else {
        await supabase.from('forum_votes').insert({
            target_id: targetId,
            target_type: targetType,
            user_id: user.id,
            reaction_type: reactionType,
        });
        return { action: 'added' };
    }
}

// ── 1.4 Edit & Delete ──────────────────────────────────────────────────────

const EDIT_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

export async function editPost(
    postId: string,
    newContent: string,
): Promise<ActionState> {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Nicht eingeloggt.' };

    const trimmed = newContent.trim();
    if (trimmed.length < 2) return { error: 'Inhalt ist zu kurz.' };

    const { data: post } = await supabase
        .from('forum_posts')
        .select('author_id, thread_id, created_at')
        .eq('id', postId)
        .single();

    if (!post) return { error: 'Beitrag nicht gefunden.' };
    if (post.author_id !== user.id) return { error: 'Nur der Autor kann diesen Beitrag bearbeiten.' };

    const age = Date.now() - new Date(post.created_at).getTime();
    if (age > EDIT_WINDOW_MS) return { error: 'Beiträge können nur innerhalb von 48 Stunden bearbeitet werden.' };

    const { error } = await supabase
        .from('forum_posts')
        .update({ content: trimmed, updated_at: new Date().toISOString() })
        .eq('id', postId);

    if (error) return { error: 'Fehler: ' + error.message };

    revalidatePath(`/forum/thread/${post.thread_id}`);
    return { success: true };
}

export async function deletePost(postId: string): Promise<ActionState> {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Nicht eingeloggt.' };

    const { data: post } = await supabase
        .from('forum_posts')
        .select('author_id, thread_id')
        .eq('id', postId)
        .single();

    if (!post) return { error: 'Beitrag nicht gefunden.' };
    if (post.author_id !== user.id) return { error: 'Nur der Autor kann diesen Beitrag löschen.' };

    const { error } = await supabase
        .from('forum_posts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', postId);

    if (error) return { error: 'Fehler: ' + error.message };

    revalidatePath(`/forum/thread/${post.thread_id}`);
    return { success: true };
}

export async function editThread(
    threadId: string,
    newContent: string,
): Promise<ActionState> {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Nicht eingeloggt.' };

    const trimmed = newContent.trim();
    if (trimmed.length < 10) return { error: 'Inhalt ist zu kurz (min. 10 Zeichen).' };

    const { data: thread } = await supabase
        .from('forum_threads')
        .select('author_id, category_id, created_at')
        .eq('id', threadId)
        .single();

    if (!thread) return { error: 'Thread nicht gefunden.' };
    if (thread.author_id !== user.id) return { error: 'Nur der Ersteller kann diesen Thread bearbeiten.' };

    const age = Date.now() - new Date(thread.created_at).getTime();
    if (age > EDIT_WINDOW_MS) return { error: 'Threads können nur innerhalb von 48 Stunden bearbeitet werden.' };

    const { error } = await supabase
        .from('forum_threads')
        .update({ content: trimmed, updated_at: new Date().toISOString() })
        .eq('id', threadId);

    if (error) return { error: 'Fehler: ' + error.message };

    revalidatePath(`/forum/thread/${threadId}`);
    return { success: true };
}

// ── 1.6 Bookmarks ────────────────────────────────────────────────────

export async function toggleForumBookmark(
    targetId: string,
    targetType: 'thread' | 'post',
): Promise<{ action: 'added' | 'removed' } | { error: string }> {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Nicht angemeldet.' };

    const { data: existing } = await supabase
        .from('forum_bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('target_id', targetId)
        .maybeSingle();

    if (existing) {
        await supabase.from('forum_bookmarks').delete().eq('id', existing.id);
        return { action: 'removed' };
    } else {
        await supabase.from('forum_bookmarks').insert({
            user_id: user.id,
            target_id: targetId,
            target_type: targetType,
        });
        return { action: 'added' };
    }
}

// ── 2.4 Thread Subscriptions ────────────────────────────────────────

export async function toggleThreadSubscription(
    threadId: string,
): Promise<{ action: 'subscribed' | 'unsubscribed' } | { error: string }> {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Nicht angemeldet.' };

    const { data: existing } = await supabase
        .from('forum_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('thread_id', threadId)
        .maybeSingle();

    if (existing) {
        await supabase.from('forum_subscriptions').delete().eq('id', existing.id);
        return { action: 'unsubscribed' };
    } else {
        await supabase.from('forum_subscriptions').insert({
            user_id: user.id,
            thread_id: threadId,
        });
        return { action: 'subscribed' };
    }
}

// ── 2.5 Polls ────────────────────────────────────────────────────────

export async function voteOnPoll(
    optionId: string,
): Promise<{ action: 'voted' | 'removed' } | { error: string }> {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Nicht angemeldet.' };

    const { data: existing } = await supabase
        .from('forum_poll_votes')
        .select('id')
        .eq('option_id', optionId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (existing) {
        await supabase.from('forum_poll_votes').delete().eq('id', existing.id);
        return { action: 'removed' };
    } else {
        const { error } = await supabase.from('forum_poll_votes').insert({
            option_id: optionId,
            user_id: user.id,
        });
        if (error) return { error: error.message };
        return { action: 'voted' };
    }
}

