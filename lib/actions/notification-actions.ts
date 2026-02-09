'use server';

import { createAdminClient } from '@/lib/supabase-server';
import { NotificationType } from '@/app/context/UserNotificationContext';
import { sendNewBrewEmail, sendNewRatingEmail, sendForumReplyEmail } from '@/lib/email';

interface CreateNotificationOptions {
    userId: string;
    actorId?: string | null;
    type: NotificationType;
    data: any;
}

/**
 * Creates a notification in the database.
 * Uses Admin Client to bypass RLS.
 */
export async function createNotification({ userId, actorId = null, type, data }: CreateNotificationOptions) {
    const supabase = createAdminClient();

    const { error } = await supabase
        .from('notifications')
        .insert({
            user_id: userId,
            actor_id: actorId,
            type,
            data
        });

    if (error) {
        console.error('Error creating notification:', error);
        return { success: false, error };
    }

    return { success: true };
}

type PreferenceKey = 'email_new_brew' | 'email_new_rating' | 'email_new_message';

// Helper to get recipients in a brewery compliant with preferences
async function getRecipientsWithPreference(breweryId: string, prefKey: PreferenceKey) {
    const supabase = createAdminClient();
    
    // Get members of the brewery who have the preference enabled
    const { data: members, error } = await supabase
        .from('brewery_members')
        .select('user_id, preferences')
        .eq('brewery_id', breweryId);

    if (error || !members) {
        console.error("Error fetching members for notification:", error);
        return [];
    }

    const recipientIds = members
        .filter(m => (m.preferences as any)?.[prefKey] === true)
        .map(m => m.user_id);

    if (recipientIds.length === 0) return [];

    const recipients = [];
    for (const uid of recipientIds) {
        const { data: { user } } = await supabase.auth.admin.getUserById(uid);
        if (user && user.email) {
            recipients.push({ email: user.email, userId: uid });
        }
    }
    
    return recipients;
}

export async function notifyNewBrew(breweryId: string, brewId: string, brewName: string, brewType: string, authorName: string) {
    try {
        const recipients = await getRecipientsWithPreference(breweryId, 'email_new_brew');
        for (const recipient of recipients) {
            await sendNewBrewEmail(recipient.email, brewName, brewType, authorName, brewId);
        }
    } catch (e) { console.error('Error sending brew notifications', e); }
}

export async function notifyNewRating(breweryId: string, brewId: string, brewName: string, rating: number, comment: string, authorName: string) {
    try {
        const recipients = await getRecipientsWithPreference(breweryId, 'email_new_rating');
        for (const recipient of recipients) {
            await sendNewRatingEmail(recipient.email, brewName, rating, comment, authorName, brewId);
        }
    } catch (e) { console.error('Error sending rating notifications', e); }
}

export async function notifyNewForumReply(threadId: string, replyAuthorName: string, preview: string) {
    try {
        const supabase = createAdminClient();
        
        // Get thread details to find the thread author
        const { data: thread } = await supabase
            .from('forum_threads')
            .select('*, author:profiles(id, active_brewery_id)')
            .eq('id', threadId)
            .single();
            
        if (!thread || !thread.author) return;

        const authorProfile = thread.author as any; 
        const breweryId = authorProfile.active_brewery_id;

        if (!breweryId) return; 

        // Check preferences
        const { data: membership } = await supabase
            .from('brewery_members')
            .select('preferences')
            .eq('brewery_id', breweryId)
            .eq('user_id', authorProfile.id)
            .single();

        const preferences = (membership?.preferences as any) || {};

        if (preferences.email_new_message) {
            const { data: { user } } = await supabase.auth.admin.getUserById(authorProfile.id);
            if (user && user.email) {
                await sendForumReplyEmail(user.email, replyAuthorName, thread.title, preview, threadId);
            }
        }
    } catch (e) { console.error('Error sending forum notifications', e); }
}
