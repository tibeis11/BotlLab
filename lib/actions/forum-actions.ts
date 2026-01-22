'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { cleanText } from '@/lib/profanity';
import { checkAndGrantAchievements } from '@/lib/achievements';

const threadSchema = z.object({
  title: z.string().min(5, "Titel muss mindestens 5 Zeichen lang sein").max(100),
  categoryId: z.string().uuid("Ungültige Kategorie"),
  content: z.string().min(10, "Inhalt muss mindestens 10 Zeichen lang sein"),
  brewId: z.string().uuid().optional().nullable()
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

    // Validation
    const rawBrewId = formData.get('brewId');
    const processedBrewId = (typeof rawBrewId === 'string' && rawBrewId.length > 0) ? rawBrewId : null;

    const validatedFields = threadSchema.safeParse({
        title: formData.get('title'),
        categoryId: formData.get('categoryId'),
        content: formData.get('content'),
        // Handle empty string for optional brewId
        brewId: processedBrewId
    });

    if (!validatedFields.success) {
         // Flatten Zod errors
         const fieldErrors = validatedFields.error.flatten().fieldErrors;
         // Convert to string array or just keep object, simpler to return first error string for generic error field
         return { error: 'Bitte überprüfe deine Eingaben.', message: 'Validierungsfehler' };
    }

    const { title, categoryId, content, brewId } = validatedFields.data;

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
            brew_id: brewId
        })
        .select()
        .single();

    if (error) {
        return { error: 'Datenbank Fehler: ' + error.message };
    }
    
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
    revalidatePath(`/forum/${categoryId}`); // Would need slug, but revalidating root is safer or we fetch cat slug

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

    // 1. Fetch thread info for notifications
    const { data: thread } = await supabase
        .from('forum_threads')
        .select('author_id, title')
        .eq('id', threadId)
        .single();

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

    // Handle Notifications (Service Role needed to insert for other users usually, or to be safe)
    if (thread && thread.author_id !== user.id) {
        try {
            // Check for @autor mention
            const isMention = cleanContent.toLowerCase().includes('@autor');
            
            // We need a service client to bypass RLS for inserting notifications to others if blocked
            const { createClient: createAdminClient } = await import('@supabase/supabase-js');
            const supabaseAdmin = createAdminClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            
            await supabaseAdmin.from('notifications').insert({
                user_id: thread.author_id,
                actor_id: user.id,
                type: isMention ? 'forum_mention' : 'forum_reply',
                data: {
                    thread_id: threadId,
                    post_id: postData.id,
                    thread_title: thread.title,
                    message_preview: cleanContent.substring(0, 50) + (cleanContent.length > 50 ? '...' : '')
                }
            });
        } catch (e) {
            console.error("Notification Error:", e);
            // Don't block post creation if notification fails
        }
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
