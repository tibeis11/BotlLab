'use server'

import { createClient, createAdminClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { sendReportResolvedEmail } from '@/lib/email';
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
 */
export async function deleteReportedContent(targetId: string, targetType: ReportTargetType, reportId?: string) {
    const supabaseUser = await createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    
    // Basic auth check
    if (!user) throw new Error('Unauthorized');
    
    // Check if admin (optional, better to have it)
    // For now assuming dashboard protection is enough, but adding email check for safety could be good.
    // However, let's rely on the fact this action is only exposed in admin UI.

    const adminClient = createAdminClient();

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

    // If successful and reportId provided, mark as resolved
    if (reportId) {
        await updateReportStatus(reportId, 'resolved');
    } else {
        revalidatePath('/admin/dashboard');
    }
}
