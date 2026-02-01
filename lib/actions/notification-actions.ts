'use server';

import { createAdminClient } from '@/lib/supabase-server';
import { NotificationType } from '@/app/context/UserNotificationContext';

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

/**
 * DEPRECATED: Use createNotification instead for internal app logic.
 * This was a placeholder for email-only notifications.
 */
export async function sendNotificationEmail(
    type: 'NEW_BREW' | 'NEW_RATING' | 'NEW_MESSAGE',
    breweryId: string,
    payload: any
) {
    console.log(`[Mock Mail Service] Would send '${type}' email for brewery ${breweryId}. Payload:`, payload);
    return { success: true, mocked: true };
}
