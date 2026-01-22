'use server'

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { Database } from '@/lib/database.types';

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
        .not('image_url', 'like', '/default_label/%')
        .not('image_url', 'like', '/brand/%')
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
    const formattedBrews: PendingItem[] = (brews || []).map(b => ({
        type: 'brew',
        id: b.id,
        name: b.name,
        image_url: b.image_url,
        cap_url: b.cap_url,
        brewery_id: b.brewery_id,
        created_at: b.created_at,
        moderation_status: b.moderation_status as ModerationStatus,
        // Supabase returns an array for the relation sometimes, or single obj. Handle both.
        brewery: Array.isArray(b.brewery) ? b.brewery[0] : b.brewery
    }));

    const formattedBreweries: PendingItem[] = (breweries || []).map(b => ({
        type: 'brewery',
        id: b.id,
        name: b.name,
        image_url: b.logo_url, // Map logo to image_url for generic handling
        created_at: b.created_at,
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
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const table = type === 'brew' ? 'brews' : 'breweries';

    const { error } = await supabase
        .from(table)
        .update({
            moderation_status: 'approved',
            moderated_by: user.id,
            moderated_at: new Date().toISOString(),
            moderation_rejection_reason: null
        })
        .eq('id', id);

    if (error) throw error;
    revalidatePath('/admin/dashboard/moderation');
}

/**
 * Lehnt ein Item ab UND löscht es physikalisch aus dem Storage.
 */
export async function rejectItem(id: string, type: 'brew' | 'brewery', reason: string, imageUrl: string | null) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

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
        moderated_by: user.id,
        moderated_at: new Date().toISOString()
    };

    if (type === 'brew') {
        updatePayload.image_url = '/default_label/default.png';
        // Note: For brews, we might handle caps separately or assume caps are rejected with image?
        // Current logic simpler: Main reject for Brew usually means Image reject.
        // Complex logic would need separate actions or more granular control.
    } else {
        updatePayload.logo_url = null; // Breweries have no default logo url in DB, handled by Frontend
    }

    const table = type === 'brew' ? 'brews' : 'breweries';
    
    const { error } = await supabase
        .from(table)
        .update(updatePayload)
        .eq('id', id);

    if (error) throw error;
    
    revalidatePath('/admin/dashboard/moderation');
}
