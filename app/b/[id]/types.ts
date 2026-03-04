/**
 * Phase 5.1 — Typen für die Bottle-Label-Seite (/b/[id])
 *
 * Ersetzt `State<any>` für alle kritischen State-Variablen in page.tsx.
 */

// ---------------------------------------------------------------------------
// Brew
// ---------------------------------------------------------------------------

export interface BrewData {
  id: string;
  name: string;
  style?: string | null;
  image_url?: string | null;
  created_at?: string | null;
  user_id: string;
  brewery_id?: string | null;
  description?: string | null;
  brew_type?: string | null;
  /** Raw JSON recipe data from Supabase — shape varies per brew_type, kept as any intentionally */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  remix_parent_id?: string | null;
  cap_url?: string | null;
  flavor_profile?: Record<string, number> | null;
  moderation_status?: string | null;
  moderation_rejection_reason?: string | null;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export interface SessionData {
  id: string;
  brewed_at?: string | null;
  bottling_date?: string | null;
  batch_number?: string | null;
  volume_liters?: number | null;
  [key: string]: unknown; // brewing_sessions has many fields — allow extra via index signature
}

// ---------------------------------------------------------------------------
// Bottle (the `data` state — bottle + joined brew + session)
// ---------------------------------------------------------------------------

export interface BottleWithBrew {
  id: string;
  bottle_number?: number | null;
  brew_id: string;
  session_id?: string | null;
  filled_at?: string | null;
  /** Joined via brew_id */
  brews: BrewData | null;
  /** Joined via session_id */
  session: SessionData | null;
}

// ---------------------------------------------------------------------------
// Brewery
// ---------------------------------------------------------------------------

export interface BreweryData {
  id: string;
  name: string;
  logo_url?: string | null;
  location?: string | null;
  website?: string | null;
  moderation_status?: string | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Rating
// ---------------------------------------------------------------------------

export interface RatingData {
  id: string;
  brew_id: string;
  user_id?: string | null;
  rating: number;
  author_name: string;
  comment?: string | null;
  created_at: string;
  flavor_tags?: string[] | null;
  moderation_status?: string | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Team / Brewery Members
// ---------------------------------------------------------------------------

export interface TeamMember {
  role: string;
  profiles: {
    display_name?: string | null;
    logo_url?: string | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Brewer Profile (for the public profile section)
// ---------------------------------------------------------------------------

export interface BrewerProfile {
  id: string;
  display_name?: string | null;
  logo_url?: string | null;
  bio?: string | null;
  profile_views?: number | null;
  app_mode?: string | null;
  [key: string]: unknown;
}
