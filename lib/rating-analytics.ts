import { supabase } from "./supabase";

export interface TasteProfile {
  bitterness: number;
  sweetness: number;
  body: number;
  carbonation: number;
  acidity: number;
  count: number; 
}

export interface FlavorDistribution {
  tagId: string;
  label: string;
  count: number;
  percentage: number;
}

// Importing FLAVOR_TAGS to map labels
import { FLAVOR_TAGS } from "./rating-config";

export async function getBrewTasteProfile(
  brewId: string,
): Promise<TasteProfile | null> {
  const { data, error } = await supabase.rpc("get_brew_taste_profile", {
    p_brew_id: brewId,
  });

  if (error) {
    console.error("Error fetching taste profile:", error);
    return null;
  }
  
  // Wenn kein Rating existiert, geben alle AVGs null zurück, oder count ist 0
  if (!data || data.count === 0) return null;

  return data as TasteProfile;
}

export async function getBrewFlavorDistribution(
  brewId: string,
): Promise<FlavorDistribution[]> {
  const { data, error } = await supabase
    .from("ratings")
    .select("flavor_tags")
    .eq("brew_id", brewId)
    .eq("moderation_status", "auto_approved")
    .not("flavor_tags", "is", null);

  if (error || !data) return [];

  const tagCounts: Record<string, number> = {};
  
  data.forEach((rating) => {
    if (rating.flavor_tags) {
      rating.flavor_tags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });

  return Object.entries(tagCounts)
    .map(([tagId, count]) => {
      const tagConfig = FLAVOR_TAGS.find((t) => t.id === tagId);
      return {
        tagId,
        label: tagConfig?.label || tagId,
        count,
        percentage: Math.round((count / data.length) * 100),
      };
    })
    .sort((a, b) => b.count - a.count);
}

interface RatingWithTaste {
  taste_bitterness: number | null;
  taste_sweetness: number | null;
  taste_body: number | null;
  taste_carbonation: number | null;
  taste_acidity: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface DistributionData {
  bitterness: Record<number, number>;
  sweetness: Record<number, number>;
  body: Record<number, number>;
  carbonation: Record<number, number>;
  acidity: Record<number, number>;
  [key: string]: Record<number, number>;
}

export async function getAttributeDistribution(brewId: string): Promise<DistributionData> {
  const { data, error } = await supabase
    .from('ratings')
    .select('taste_bitterness, taste_sweetness, taste_body, taste_carbonation, taste_acidity')
    .eq('brew_id', brewId)
    .eq('moderation_status', 'auto_approved');

  // Helper to init 1-10 counts
  const createBuckets = () => {
    const buckets: Record<number, number> = {};
    for (let i = 1; i <= 10; i++) buckets[i] = 0;
    return buckets;
  };

  const result: DistributionData = {
    bitterness: createBuckets(),
    sweetness: createBuckets(),
    body: createBuckets(),
    carbonation: createBuckets(),
    acidity: createBuckets(),
  };

  if (error || !data) return result;

  const attributes = ['taste_bitterness', 'taste_sweetness', 'taste_body', 'taste_carbonation', 'taste_acidity'];
  const mapping: Record<string, string> = {
      'taste_bitterness': 'bitterness',
      'taste_sweetness': 'sweetness', 
      'taste_body': 'body',
      'taste_carbonation': 'carbonation',
      'taste_acidity': 'acidity'
  };

  (data as unknown as RatingWithTaste[]).forEach((r) => {
      attributes.forEach(attr => {
          const val = r[attr];
          if (typeof val === 'number' && val >= 1 && val <= 10) {
              const key = mapping[attr];
              result[key][Math.round(val)]++; // Ensure integer bucket
          }
      });
  });

  return result;
}

export async function getRatingsWithProfiles(brewId: string) {
    const { data } = await supabase
    .from('ratings')
    .select('*')
    .eq('brew_id', brewId)
    .eq('moderation_status', 'auto_approved')
    .order('created_at', { ascending: false });
    
    return data || [];
}

export interface TimelineDataPoint {
  date: string; // YYYY-MM
  counts: number;
  bitterness?: number;
  sweetness?: number;
  body?: number;
  carbonation?: number;
  acidity?: number;
}

export async function getTasteTimeline(brewId: string): Promise<TimelineDataPoint[]> {
  const { data, error } = await supabase
    .from('ratings')
    .select('created_at, taste_bitterness, taste_sweetness, taste_body, taste_carbonation, taste_acidity')
    .eq('brew_id', brewId)
    .eq('moderation_status', 'auto_approved')
    .order('created_at', { ascending: true });

  if (error || !data || data.length === 0) return [];

  const grouped: Record<string, { count: number; sums: Record<string, number>; counts: Record<string, number> }> = {};

  (data as unknown as RatingWithTaste[]).forEach((r) => {
    // Group by Month: YYYY-MM
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    if (!grouped[key]) {
        grouped[key] = { 
            count: 0, 
            sums: { taste_bitterness: 0, taste_sweetness: 0, taste_body: 0, taste_carbonation: 0, taste_acidity: 0 },
            counts: { taste_bitterness: 0, taste_sweetness: 0, taste_body: 0, taste_carbonation: 0, taste_acidity: 0 }
        };
    }

    let hasAny = false;
    ['taste_bitterness', 'taste_sweetness', 'taste_body', 'taste_carbonation', 'taste_acidity'].forEach(attr => {
        if (typeof r[attr] === 'number') {
            grouped[key].sums[attr] += r[attr];
            grouped[key].counts[attr]++;
            hasAny = true;
        }
    });
    
    if (hasAny) grouped[key].count++;
  });

  return Object.entries(grouped)
    .map(([date, { count, sums, counts }]) => {
       const point: TimelineDataPoint = { date, counts: count };
       
       if (counts.taste_bitterness > 0) point.bitterness = Number((sums.taste_bitterness / counts.taste_bitterness).toFixed(1));
       if (counts.taste_sweetness > 0) point.sweetness = Number((sums.taste_sweetness / counts.taste_sweetness).toFixed(1));
       if (counts.taste_body > 0) point.body = Number((sums.taste_body / counts.taste_body).toFixed(1));
       if (counts.taste_carbonation > 0) point.carbonation = Number((sums.taste_carbonation / counts.taste_carbonation).toFixed(1));
       if (counts.taste_acidity > 0) point.acidity = Number((sums.taste_acidity / counts.taste_acidity).toFixed(1));

       return point;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
