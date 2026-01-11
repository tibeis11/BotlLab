import { supabase } from '@/lib/supabase';

export type FeedItemType = 'POST' | 'BREW_CREATED' | 'BREW_UPDATED' | 'MEMBER_JOINED' | 'ACHIEVEMENT' | 'BREW_RATED';

export interface FeedItem {
  id: string;
  brewery_id: string;
  user_id: string | null;
  type: FeedItemType;
  content: {
    message?: string;
    brew_id?: string;
    brew_name?: string;
    member_name?: string;
    title?: string;
    author?: string;
    rating?: number;
  };
  created_at: string;
  profiles?: {
    display_name: string;
    logo_url: string;
  }
}

/**
 * Fügt einen neuen Eintrag zum Feed hinzu
 */
export async function addToFeed(
  breweryId: string, 
  user: { id: string }, 
  type: FeedItemType, 
  content: FeedItem['content']
) {
  try {
    const { error } = await supabase
      .from('brewery_feed')
      .insert({
        brewery_id: breweryId,
        user_id: user.id,
        type,
        content
      });
      
    if (error) throw error;
  } catch (err) {
    console.error("Error adding to feed:", err);
  }
}

/**
 * Lädt den Feed für eine Brauerei
 */
export async function getBreweryFeed(breweryId: string) {
  const { data, error } = await supabase
    .from('brewery_feed')
    .select(`
      *,
      profiles:user_id (
        display_name,
        logo_url
      )
    `)
    .eq('brewery_id', breweryId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching feed:", JSON.stringify(error, null, 2));
    return [];
  }

  return data as FeedItem[];
}
