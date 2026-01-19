'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { TimelineEvent, SessionPhase } from '@/lib/types/session-log';
import { addTimelineEvent, updateSessionPhase, removeTimelineEvent } from '@/lib/session-log-service';
import { useRouter } from 'next/navigation';

// Define the Session Data Structure (matching DB)
export interface SessionData {
  id: string;
  brew_id: string;
  brewery_id: string;
  status: string;
  phase: SessionPhase;
  batch_code: string | null;
  timeline: TimelineEvent[];
  started_at: string | null;
  created_at: string;
  current_gravity: number | null;
  apparent_attenuation: number | null;
  measurements?: {
    og?: number;
    fg?: number;
    volume?: number;
    abv?: number;
  };
  notes?: string | null;
  brew?: { 
    name: string; 
    style: string | null;
    recipe_data: any; 
  } | null;
}

interface SessionContextType {
  session: SessionData | null;
  loading: boolean;
  addEvent: (event: Omit<TimelineEvent, 'id' | 'date' | 'createdAt'> & { date?: string }) => Promise<void>;
  removeEvent: (eventId: string) => Promise<void>;
  changePhase: (newPhase: SessionPhase) => Promise<void>;
  deleteSession: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ 
  children, 
  sessionId 
}: { 
  children: ReactNode; 
  sessionId: string;
}) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchSession = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('brewing_sessions')
        .select(`
          *,
          brew:brews ( name, style, recipe_data:data )
        `)
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      setSession(data as SessionData);
    } catch (error: any) {
      console.error('Error fetching session:', error);
      if (error?.message) console.error('Error message:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) fetchSession();
  }, [sessionId]);

  const deleteSession = async () => {
      if (!session) return;
      // Database Trigger/FK handles setting bottles to NULL
      const { error } = await supabase.from('brewing_sessions').delete().eq('id', sessionId);
      if (error) {
          console.error("Delete failed:", error);
          throw error;
      }
      
      // Redirect to sessions list
      router.push(`/team/${session.brewery_id}/sessions`);
  };

  const addEvent = async (event: Omit<TimelineEvent, 'id' | 'date' | 'createdAt'> & { date?: string }) => {
    if (!session) return;
    
    try {
      const updatedTimeline = await addTimelineEvent(sessionId, event);
      setSession(prev => prev ? { ...prev, timeline: updatedTimeline } : null);
    } catch (e) {
      console.error(e);
      // In a real app, use toast here
    }
  };

  const removeEvent = async (eventId: string) => {
    if (!session) return;
    try {
        const updatedTimeline = await removeTimelineEvent(sessionId, eventId);
        setSession(prev => prev ? { ...prev, timeline: updatedTimeline } : null);
    } catch (e) {
        console.error(e);
    }
  };

  const changePhase = async (newPhase: SessionPhase) => {
    if (!session) return;
    try {
      await updateSessionPhase(sessionId, newPhase);
      setSession(prev => prev ? { ...prev, phase: newPhase } : null);
      
      // Auto-refresh to ensure all server-side triggers (if any) are reflected
      // But for now local update is faster
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SessionContext.Provider value={{ session, loading, addEvent, removeEvent, changePhase, deleteSession, refreshSession: fetchSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
