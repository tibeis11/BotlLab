'use server'

import { createClient, createAdminClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { sendReportResolvedEmail, sendContentModeratedEmail } from '@/lib/email';
import { createNotification } from './notification-actions';

export type ReportTargetType = 'brew' | 'user' | 'brewery' | 'forum_post' | 'forum_thread' | 'comment';
export type ReportReason = 'spam' | 'nsfw' | 'harassment' | 'copyright' | 'other';
export type ReportStatus = 'open' | 'resolved' | 'dismissed';

export interface ReportItem {
    id: string;
    reporter_id: string;
    target_id: string;
    target_type: ReportTargetType;
    reason: ReportReason;
    details: string | null;
    status: ReportStatus;
    created_at: string;
    // Joined data
    reporter?: { email?: string; display_name?: string; logo_url?: string | null };
    // Content data (fetched dynamically in UI based on type/id)
}

/**
 * Creates a new content report (User facing).
 */
export async function submitContentReport(
    targetId: string, 
    targetType: ReportTargetType, 
    reason: ReportReason, 
    details?: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('You must be logged in to report content.');

    const { error } = await supabase
        .from('reports')
        .insert({
            reporter_id: user.id,
            target_id: targetId,
            target_type: targetType,
            reason: reason,
            details: details || null,
            status: 'open'
        });

    if (error) {
        console.error('Error submitting report:', error);
        throw new Error('Failed to submit report');
    }
}

/**
 * ADMIN ONLY: Fetch all open reports.
 */
export async function getOpenReports() {
    // Use Admin Client to bypass RLS (Admins need to see ALL reports, not just their own)
    const supabase = createAdminClient();
    
    // Fetch reports
    const { data: reports, error } = await supabase
        .from('reports')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    
    if (!reports || reports.length === 0) return [];

    // Fetch reporter profiles manually
    const reporterIds = Array.from(new Set(reports.map((r: any) => r.reporter_id)));
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, logo_url')
        .in('id', reporterIds);
        
    const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);

    // Merge
    return reports.map((r: any) => ({
        ...r,
        reporter: profileMap.get(r.reporter_id) || { display_name: 'Unknown User', logo_url: null }
    }));
}

/**
 * ADMIN ONLY: Mark report as resolved or dismissed.
 */
export async function updateReportStatus(reportId: string, status: 'resolved' | 'dismissed') {
    const adminClient = createAdminClient();

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const resolvedBy = user?.id || null;

        // Get report info for notification before update
        const { data: report } = await adminClient
            .from('reports')
            .select('reporter_id, created_at, reason')
            .eq('id', reportId)
            .single();

        const { error } = await adminClient
            .from('reports')
            .update({
                status: status,
                resolved_by: resolvedBy,
                resolved_at: new Date().toISOString()
            })
            .eq('id', reportId);

        if (error) throw error;

        if (report && status === 'resolved') {
            try {
                const { data: { user: reporter } } = await adminClient.auth.admin.getUserById(report.reporter_id);
                
                // 1. In-App Notification
                await createNotification({
                    userId: report.reporter_id,
                    actorId: resolvedBy,
                    type: 'report_resolved',
                    data: {
                        report_id: reportId,
                        reason: report.reason
                    }
                });

                // 2. Email Notification
                if (reporter?.email) {
                    const reportDate = new Date(report.created_at).toLocaleDateString('de-DE');
                    const statusText = 'Abgeschlossen';
                    const messageSummary = `Deine Meldung bezüglich "${report.reason}" wurde erfolgreich bearbeitet.`;
                    
                    await sendReportResolvedEmail(reporter.email, reportDate, statusText, messageSummary, reportId);
                }
            } catch (e) {
                console.error('Failed to send report resolution notification:', e);
            }
        }
    } catch (err) {
        console.error('Failed to update report status with admin client:', err);
        throw err;
    }

    // Revalidate admin dashboard cache
    revalidatePath('/admin/dashboard');
}

/**
 * ADMIN ONLY: Delete reported content and resolve report.
 * WARNING: This is destructive and uses the service role!
 * 
 * DSA Compliance: Notifies the content author about the moderation action
 * with the reason, so they can understand why content was removed.
 */
export async function deleteReportedContent(targetId: string, targetType: ReportTargetType, reportId?: string) {
    const supabaseUser = await createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    
    // Basic auth check
    if (!user) throw new Error('Unauthorized');

    const adminClient = createAdminClient();

    // ── DSA: Fetch content author before deletion so we can notify them ──
    let contentAuthorId: string | null = null;
    let contentTitle: string | null = null;
    let reportReason: string | null = null;

    // Get report reason if available
    if (reportId) {
        const { data: report } = await adminClient
            .from('reports')
            .select('reason, details')
            .eq('id', reportId)
            .single();
        reportReason = report?.reason ?? null;
    }

    // Determine content author based on target type
    if (targetType === 'forum_thread') {
        const { data } = await adminClient.from('forum_threads').select('author_id, title').eq('id', targetId).single();
        contentAuthorId = data?.author_id ?? null;
        contentTitle = data?.title ?? null;
    } else if (targetType === 'forum_post') {
        const { data } = await adminClient.from('forum_posts').select('author_id, content').eq('id', targetId).single();
        contentAuthorId = data?.author_id ?? null;
        contentTitle = data?.content ? data.content.substring(0, 80) : null;
    } else if (targetType === 'brew') {
        const { data } = await adminClient.from('brews').select('user_id, name').eq('id', targetId).single();
        contentAuthorId = data?.user_id ?? null;
        contentTitle = data?.name ?? null;
    } else if (targetType === 'brewery') {
        const { data: brewery } = await adminClient.from('breweries').select('name').eq('id', targetId).single();
        const { data: ownerMember } = await adminClient.from('brewery_members').select('user_id').eq('brewery_id', targetId).eq('role', 'owner').single();
        contentAuthorId = ownerMember?.user_id ?? null;
        contentTitle = brewery?.name ?? null;
    }

    // ── Perform deletion ──
    let error = null;

    if (targetType === 'brew') {
        const res = await adminClient.from('brews').delete().eq('id', targetId);
        error = res.error;
    } else if (targetType === 'brewery') {
         const res = await adminClient.from('breweries').delete().eq('id', targetId);
         error = res.error;
    } else if (targetType === 'user') {
        // Delete user from auth (cascades to profiles usually if set up, or profile manually)
        const res = await adminClient.auth.admin.deleteUser(targetId);
        error = res.error;
    } else {
        // Fallback for other tables
        const tableMap: Record<string, string> = {
            'forum_post': 'forum_posts',
            'forum_thread': 'forum_threads',
            'comment': 'comments'
        };
        if (tableMap[targetType]) {
            const res = await adminClient.from(tableMap[targetType] as any).delete().eq('id', targetId);
            error = res.error;
        } else {
             throw new Error(`Deletion for type ${targetType} not implemented.`);
        }
    }

    if (error) {
        console.error('Delete Content Error:', error);
        throw new Error('Failed to delete content: ' + error.message);
    }

    // ── DSA: Notify content author about moderation action ──
    if (contentAuthorId && contentAuthorId !== user.id) {
        const reasonLabels: Record<string, string> = {
            spam: 'Spam / Werbung',
            nsfw: 'Unangemessener Inhalt (NSFW / Gewalt)',
            harassment: 'Beleidigung / Mobbing',
            copyright: 'Urheberrechtsverletzung',
            other: 'Verstoß gegen die Nutzungsbedingungen',
        };

        try {
            const reasonLabel = reportReason ? reasonLabels[reportReason] ?? reportReason : 'Verstoß gegen die Nutzungsbedingungen';

            await createNotification({
                userId: contentAuthorId,
                actorId: user.id,
                type: 'content_moderated',
                data: {
                    target_type: targetType,
                    target_title: contentTitle,
                    reason: reportReason,
                    reason_label: reasonLabel,
                    report_id: reportId,
                    moderated_at: new Date().toISOString(),
                    // DSA: Users must be able to appeal
                    can_appeal: true,
                },
            });

            // Also send email — DSA requires clear, accessible notification
            const { data: { user: authorUser } } = await adminClient.auth.admin.getUserById(contentAuthorId);
            if (authorUser?.email) {
                const appealParams = new URLSearchParams();
                appealParams.set('type', targetType);
                if (contentTitle) appealParams.set('title', contentTitle);
                if (reportReason) appealParams.set('reason', reportReason);
                if (reportId) appealParams.set('reportId', reportId);
                const appealUrl = `https://botllab.de/appeal?${appealParams.toString()}`;

                await sendContentModeratedEmail(
                    authorUser.email,
                    contentTitle ?? 'Dein Inhalt',
                    reasonLabel,
                    appealUrl
                );
            }
        } catch (e) {
            console.error('Failed to send content moderation notification (DSA):', e);
        }
    }

    // If successful and reportId provided, mark as resolved
    if (reportId) {
        await updateReportStatus(reportId, 'resolved');
    } else {
        revalidatePath('/admin/dashboard');
    }
}
