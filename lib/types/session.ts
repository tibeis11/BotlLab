import { Database } from "@/lib/database.types";

// Base types from Supabase
export type BrewingSession = Database["public"]["Tables"]["brewing_sessions"]["Row"];
export type SessionInsert = Database["public"]["Tables"]["brewing_sessions"]["Insert"];
export type SessionUpdate = Database["public"]["Tables"]["brewing_sessions"]["Update"];

// Discriminated Union für Session Type
export type SessionType = 'full' | 'quick';

// Extended Types mit session_type
export type FullSession = BrewingSession & {
  session_type: 'full';
  timeline: any[]; // Should have events (TimelineEvent[] when imported)
};

export type QuickSession = BrewingSession & {
  session_type: 'quick';
  timeline: []; // Empty or minimal
  measurements: {
    og?: number;
    fg?: number;
    volume?: number;
  };
};

// Union type for type guards
export type TypedSession = FullSession | QuickSession;

// Type guard: Check if session is a Quick Session
export function isQuickSession(session: BrewingSession): session is QuickSession {
  return session.session_type === 'quick';
}

// Type guard: Check if session is a Full Session
export function isFullSession(session: BrewingSession): session is FullSession {
  return session.session_type === 'full';
}
