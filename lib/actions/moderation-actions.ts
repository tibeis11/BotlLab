'use server'

import { createClient, createAdminClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { Database } from '@/lib/database.types';
import { sendImageApprovedEmail, sendImageRejectedEmail } from '@/lib/email';
import { createNotification } from './notification-actions';

export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface PendingItem {
    type: 'brew' | 'brewery';
    id: string;
    name: string;
    image_url: string | null;
    cap_url?: string | null;
    brewery_id?: string; // Only for brews
    created_at: string;
    moderation_status: ModerationStatus;
    brewery?: {
        name: string;
    } | null;
    user?: {
        email: string;
        id: string;
    } | null;
}

/**
 * Holt alle Items (Brews + Breweries), die auf Moderation warten.
 */
export async function getPendingItems() {
    const supabase = await createClient();
    
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('Nicht authentifiziert');

    // 1. Pending Brews
    // Fetch all pending brews. Filtering happens in JS to allow Crown-Cork-Only uploads.
    const { data: brews, error: brewError } = await supabase
        .from('brews')
        .select(`
            id, 
            name, 
            image_url, 
            cap_url, 
            brewery_id, 
            created_at, 
            moderation_status,
            brewery:breweries(name)
        `)
        .eq('moderation_status', 'pending')
        .order('created_at', { ascending: false });

    if (brewError) throw new Error('Fehler beim Laden der Warteschlange (Brews)');

    // 2. Pending Breweries (Logos)
    const { data: breweries, error: breweryError } = await supabase
        .from('breweries')
        .select(`
            id,
            name,
            logo_url,
            created_at,
            moderation_status
        `)
        .eq('moderation_status', 'pending')
        .not('logo_url', 'is', null) // Only check if logo exists
        .order('created_at', { ascending: false });
        
    if (breweryError) throw new Error('Fehler beim Laden der Warteschlange (Breweries)');

    // Combined Response
    const formattedBrews: PendingItem[] = (brews || [])
        .filter(b => {
            // Filter: Must have either a custom label OR a cap to be relevant for moderation
            // Otherwise it's a "ghost" pending state (e.g. default label + no cap)
            const isDefaultImage = !b.image_url || b.image_url.includes('/default_label/') || b.image_url.includes('/brand/');
            const hasCap = !!b.cap_url;
            return !isDefaultImage || hasCap;
        })
        .map(b => ({
            type: 'brew',
            id: b.id,
        name: b.name || 'Unbenanntes Rezept',
        image_url: b.image_url,
        cap_url: b.cap_url,
        brewery_id: b.brewery_id || '',
        created_at: b.created_at || new Date().toISOString(),
        moderation_status: b.moderation_status as ModerationStatus,
        // Supabase returns an array for the relation sometimes, or single obj. Handle both.
        brewery: Array.isArray(b.brewery) ? b.brewery[0] : b.brewery
    }));

    const formattedBreweries: PendingItem[] = (breweries || []).map(b => ({
        type: 'brewery',
        id: b.id,
        name: b.name || 'Unbenannte Brauerei',
        image_url: b.logo_url, // Map logo to image_url for generic handling
        created_at: b.created_at || new Date().toISOString(),
        moderation_status: b.moderation_status as ModerationStatus
    }));

    return [...formattedBrews, ...formattedBreweries].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

/**
 * Setzt ein Item (Brew oder Brewery) auf 'approved'.
 */
export async function approveItem(id: string, type: 'brew' | 'brewery') {
    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    if (!adminUser) throw new Error('Unauthorized');

    const table = type === 'brew' ? 'brews' : 'breweries';

    // Get item info for notification before updating
    const { data: itemData } = await supabase
        .from(table as any)
        .select('name, user_id, brewery_id')
        .eq('id', id)
        .single() as any;

    const { error } = await supabase
        .from(table as any)
        .update({
            moderation_status: 'approved',
            moderated_by: adminUser.id,
            moderated_at: new Date().toISOString(),
            moderation_rejection_reason: null
        })
        .eq('id', id);

    if (error) throw error;

    // Async notification
    if (itemData) {
        try {
            let recipientId = itemData.user_id;
            const breweryId = itemData.brewery_id || id;
            
            if (type === 'brewery') {
                // For brewery, find the owner
                const { data: member } = await supabase
                    .from('brewery_members')
                    .select('user_id')
                    .eq('brewery_id', id)
                    .eq('role', 'owner')
                    .maybeSingle();
                if (member) recipientId = member.user_id;
            }

            if (recipientId) {
                const adminClient = createAdminClient();
                const { data: { user: recipient } } = await adminClient.auth.admin.getUserById(recipientId);
                
                // 1. In-App Notification
                await createNotification({
                    userId: recipientId,
                    actorId: adminUser.id,
                    type: 'image_approved',
                    data: {
                        id: id,
                        name: itemData.name,
                        type: type
                    }
                });

                // 2. Email Notification
                if (recipient?.email) {
                    await sendImageApprovedEmail(recipient.email, itemData.name, id, type);
                }
            }
        } catch (e) {
            console.error('Failed to send approval notification:', e);
        }
    }

    revalidatePath('/admin/dashboard/moderation');
}

/**
 * Lehnt ein Item ab UND löscht es physikalisch aus dem Storage.
 */
export async function rejectItem(id: string, type: 'brew' | 'brewery', reason: string, imageUrl: string | null) {
    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    if (!adminUser) throw new Error('Unauthorized');

    const table = type === 'brew' ? 'brews' : 'breweries';

    // Get item info for notification before updating
    const { data: itemData } = await supabase
        .from(table as any)
        .select('name, user_id, brewery_id')
        .eq('id', id)
        .single() as any;

    // 1. Physisches Löschen der Dateien
    if (imageUrl && !imageUrl.startsWith('/default') && !imageUrl.startsWith('/brand')) { 
        try {
            const urlObj = new URL(imageUrl);
            const pathParts = urlObj.pathname.split('/public/');
            if (pathParts.length > 1) {
                const fullPath = pathParts[1];
                const bucket = fullPath.split('/')[0];
                const filePath = fullPath.substring(bucket.length + 1);
                
                await supabase.storage.from(bucket).remove([filePath]);
            }
        } catch (e) {
            console.error('Failed to parse/delete image URL:', imageUrl, e);
        }
    }

    // 2. Update Database: Set status rejected and reset to default/null
    const updatePayload: any = {
        moderation_status: 'rejected',
        moderation_rejection_reason: reason,
        moderated_by: adminUser.id,
        moderated_at: new Date().toISOString()
    };

    if (type === 'brew') {
        updatePayload.image_url = '/default_label/default.png';
    } else {
        updatePayload.logo_url = null; 
    }
    
    const { error } = await supabase
        .from(table as any)
        .update(updatePayload)
        .eq('id', id);

    if (error) throw error;

    // Async notification
    if (itemData) {
        try {
            let recipientId = itemData.user_id;
            const breweryId = itemData.brewery_id || id;
            
            if (type === 'brewery') {
                const { data: member } = await supabase
                    .from('brewery_members')
                    .select('user_id')
                    .eq('brewery_id', id)
                    .eq('role', 'owner')
                    .maybeSingle();
                if (member) recipientId = member.user_id;
            }

            if (recipientId) {
                const adminClient = createAdminClient();
                const { data: { user: recipient } } = await adminClient.auth.admin.getUserById(recipientId);
                
                // 1. In-App Notification
                await createNotification({
                    userId: recipientId,
                    actorId: adminUser.id,
                    type: 'image_rejected',
                    data: {
                        id: id,
                        name: itemData.name,
                        type: type,
                        reason: reason
                    }
                });

                // 2. Email Notification
                if (recipient?.email) {
                    await sendImageRejectedEmail(recipient.email, itemData.name, reason, breweryId);
                }
            }
        } catch (e) {
            console.error('Failed to send rejection notification:', e);
        }
    }
    
    revalidatePath('/admin/dashboard/moderation');
}
