'use server';

import { createClient, createAdminClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { createNotification } from './notification-actions';
import { sendAppealDecisionEmail } from '@/lib/email';

// NOTE: content_appeals table is added via migration but not yet in generated DB types.
// Using `as any` on .from() calls until `supabase gen types` is re-run after migration.

export interface AppealItem {
    id: string;
    user_id: string;
    report_id: string | null;
    target_type: string;
    target_title: string | null;
    moderation_reason: string | null;
    appeal_text: string;
    status: 'pending' | 'accepted' | 'rejected';
    admin_response: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_at: string;
    // Joined
    user?: { display_name: string | null; logo_url: string | null; email?: string };
}

/**
 * Submit a content moderation appeal (user-facing).
 * DSA Art. 20 — Users have the right to contest moderation decisions.
 */
export async function submitAppeal(
    targetType: string,
    targetTitle: string | null,
    moderationReason: string | null,
    appealText: string,
    reportId?: string | null
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Du musst eingeloggt sein, um einen Widerspruch einzureichen.' };
    }

    if (!appealText || appealText.trim().length < 10) {
        return { error: 'Dein Widerspruch muss mindestens 10 Zeichen lang sein.' };
    }

    // Rate limit: max 5 appeals per day
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await (supabase as any)
        .from('content_appeals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', oneDayAgo);

    if ((count ?? 0) >= 5) {
        return { error: 'Du kannst maximal 5 Widersprüche pro Tag einreichen.' };
    }

    const { error } = await (supabase as any)
        .from('content_appeals')
        .insert({
            user_id: user.id,
            report_id: reportId ?? null,
            target_type: targetType,
            target_title: targetTitle,
            moderation_reason: moderationReason,
            appeal_text: appealText.trim(),
            status: 'pending',
        });

    if (error) {
        console.error('Error submitting appeal:', error);
        return { error: 'Widerspruch konnte nicht eingereicht werden. Bitte versuche es erneut.' };
    }

    return { success: true, message: 'Dein Widerspruch wurde eingereicht und wird zeitnah geprüft.' };
}

/**
 * ADMIN ONLY: Get all pending appeals.
 */
export async function getPendingAppeals(): Promise<AppealItem[]> {
    const adminClient = createAdminClient();

    const { data: appeals, error } = await (adminClient as any)
        .from('content_appeals')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true }); // FIFO — oldest first

    if (error) {
        console.error('Error fetching appeals:', error);
        return [];
    }

    if (!appeals || appeals.length === 0) return [];

    // Fetch user profiles
    const userIds = Array.from(new Set(appeals.map((a: any) => a.user_id))) as string[];
    const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, display_name, logo_url')
        .in('id', userIds);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    return appeals.map((a: any) => ({
        ...a,
        user: profileMap.get(a.user_id) ?? { display_name: 'Unbekannt', logo_url: null },
    }));
}

/**
 * ADMIN ONLY: Resolve an appeal (accept or reject).
 * DSA Art. 20(4) — decisions must be "reasoned" (begründet).
 */
export async function resolveAppeal(
    appealId: string,
    decision: 'accepted' | 'rejected',
    adminResponse: string
) {
    const supabaseUser = await createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();

    if (!user) return { error: 'Unauthorized' };
    if (!adminResponse || adminResponse.trim().length < 5) {
        return { error: 'Bitte gib eine Begründung für deine Entscheidung an (DSA-Pflicht).' };
    }

    const adminClient = createAdminClient();

    // Get appeal data for notification
    const { data: appeal } = await (adminClient as any)
        .from('content_appeals')
        .select('user_id, target_type, target_title')
        .eq('id', appealId)
        .single();

    if (!appeal) return { error: 'Widerspruch nicht gefunden.' };

    const { error } = await (adminClient as any)
        .from('content_appeals')
        .update({
            status: decision,
            admin_response: adminResponse.trim(),
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
        })
        .eq('id', appealId);

    if (error) {
        console.error('Error resolving appeal:', error);
        return { error: 'Fehler beim Bearbeiten des Widerspruchs.' };
    }

    // Notify the user about the appeal decision
    try {
        const decisionLabel = decision === 'accepted'
            ? 'akzeptiert — dein Inhalt wird wiederhergestellt'
            : 'abgelehnt';

        await createNotification({
            userId: appeal.user_id,
            actorId: user.id,
            type: 'content_moderated', // Reuse same type, differentiate via data
            data: {
                is_appeal_response: true,
                target_type: appeal.target_type,
                target_title: appeal.target_title,
                appeal_decision: decision,
                decision_label: decisionLabel,
                admin_response: adminResponse.trim(),
                resolved_at: new Date().toISOString(),
            },
        });

        // Also send email
        const { data: { user: appealUser } } = await adminClient.auth.admin.getUserById(appeal.user_id);
        if (appealUser?.email) {
            await sendAppealDecisionEmail(
                appealUser.email,
                appeal.target_title ?? '',
                decision,
                adminResponse.trim()
            );
        }
    } catch (e) {
        console.error('Failed to notify user about appeal decision:', e);
    }

    revalidatePath('/admin/dashboard');
    return { success: true };
}
