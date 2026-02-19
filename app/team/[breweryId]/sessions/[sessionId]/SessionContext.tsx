'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { TimelineEvent, SessionPhase } from '@/lib/types/session-log';
import { addTimelineEvent, updateSessionPhase, removeTimelineEvent } from '@/lib/session-log-service';
import { useRouter } from 'next/navigation';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { useGlobalToast } from '@/app/context/AchievementNotificationContext';

// Define Offline Queue Action Types
type QueueAction = 
  | { type: 'ADD_MEASUREMENT', payload: any, tempId: string }
  | { type: 'UPDATE_SESSION', payload: Partial<SessionData> }
  | { type: 'ADD_EVENT', payload: any, tempId: string } // Note: addEvent signature slightly different
  | { type: 'CHANGE_PHASE', payload: SessionPhase }
  | { type: 'UPDATE_MEASUREMENT', payload: { id: string, updates: any } }
  | { type: 'DELETE_MEASUREMENT', payload: { id: string } };

// Define the Session Data Structure (matching DB)
export interface BrewMeasurement {
  id: string;
  measured_at: string;
  gravity: number;
  temperature: number;
  pressure: number | null;
  ph: number | null;
  note: string | null;
  source: string | null;
  is_og: boolean;
}

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
  
  // New Columns (Single Source of Truth)
  measured_og: number | null;
  measured_fg: number | null;
  measured_abv: number | null;
  measure_volume: number | null;
  measured_efficiency: number | null;
  carbonation_level: number | null;
  target_og: number | null;
  completed_at: string | null;

  // Joined Data
  measurement_history: BrewMeasurement[];
  
  // Legacy JSON fields (will be deprecated but kept for backwards compatibility during migration)
  measurements: any; // The JSON column for timers, checklists etc.
  apparent_attenuation: number | null;
  notes?: string | null;
  brew?: { 
    name: string; 
    style: string | null;
    recipe_data: any; 
  } | null;
}

interface SessionContextType {
  session: SessionData | null;
  measurements: BrewMeasurement[]; // Convenience accessor
  loading: boolean;
  addEvent: (event: Omit<TimelineEvent, 'id' | 'date' | 'createdAt'> & { date?: string }) => Promise<void>;
  removeEvent: (eventId: string) => Promise<void>;
  changePhase: (newPhase: SessionPhase) => Promise<void>;
  updateSessionData: (updates: Partial<SessionData>) => Promise<void>;
  addMeasurement: (measurement: Partial<Omit<BrewMeasurement, 'id' | 'created_at' | 'session_id'>>) => Promise<void>;
  updateMeasurement: (id: string, updates: Partial<Pick<BrewMeasurement, 'gravity' | 'temperature' | 'pressure' | 'ph' | 'note' | 'measured_at' | 'is_og'>>) => Promise<void>;
  deleteMeasurement: (id: string) => Promise<void>;
  deleteSession: () => Promise<void>;
  refreshSession: () => Promise<void>;
  isOnline: boolean;
  isSyncing: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ 
  children, 
  sessionId 
}: { 
  children: ReactNode; 
  sessionId: string;
}) {
  const supabase = useSupabase();
  const [session, setSession] = useState<SessionData | null>(null);
  const [measurements, setMeasurements] = useState<BrewMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { showToast } = useGlobalToast();
  
  // Offline Sync State
  const isOnline = useOnlineStatus();
  const [syncQueue, setSyncQueue] = useState<QueueAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load Queue
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(`offline_queue_${sessionId}`);
        if(saved) {
            try {
                setSyncQueue(JSON.parse(saved));
            } catch(e) { console.error("Queue parse error", e); }
        }
    }
  }, [sessionId]);

  // Persist Queue
  useEffect(() => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(`offline_queue_${sessionId}`, JSON.stringify(syncQueue));
    }
  }, [syncQueue, sessionId]);

  // Process Queue
  useEffect(() => {
      if (isOnline && syncQueue.length > 0 && !isSyncing) {
          processQueue();
      }
  }, [isOnline, syncQueue, isSyncing]);

  const processQueue = async () => {
      setIsSyncing(true);
      const queue = [...syncQueue];
      
      try {
          // Process sequentially
          for (const item of queue) {
              /*
               * Handle different action types
               * If successful, remove from queue
               * If failed, keep in queue and stop processing? Or skip?
               * For now: stop processing on error to preserve order dependent logic
               */
              try {
                  if (item.type === 'ADD_MEASUREMENT') {
                        const { tempId, ...payload } = item as any;
                        const { data, error } = await supabase.from('brew_measurements').insert(payload).select().single();
                        if (error) throw error;
                        // Replace tempId with realId in local state? Not strictly necessary for display, but good for follow-up actions
                        // We rely on optimistic UI already having the item. Maybe fetchSession() later.
                  } else if (item.type === 'UPDATE_SESSION') {
                        const { payload } = item as any;
                        const { error } = await supabase.from('brewing_sessions').update(payload).eq('id', sessionId);
                        if (error) throw error;
                  } else if (item.type === 'ADD_EVENT') {
                        const { tempId, payload } = item as any;
                        // payload is timeline event minus id/date
                        await addTimelineEvent(sessionId, payload);
                  } else if (item.type === 'CHANGE_PHASE') {
                        const { payload } = item as any;
                        await updateSessionPhase(sessionId, payload);
                  } else if (item.type === 'UPDATE_MEASUREMENT') {
                        const { payload } = item as any;
                        await supabase.from('brew_measurements').update(payload.updates).eq('id', payload.id);
                  } else if (item.type === 'DELETE_MEASUREMENT') {
                        const { payload } = item as any;
                        await supabase.from('brew_measurements').delete().eq('id', payload.id);
                  }
                  
                  // Success: Remove item
                  setSyncQueue(prev => prev.filter(i => i !== item));
              } catch(e) {
                  console.error("Sync item failed:", item, e);
                  // Break loop, retry later
                  break; 
              }
          }
          
          // Refresh session to get server-generated IDs/timestamps
          await fetchSession(); 
          showToast("Synchronisation", "Daten erfolgreich synchronisiert.", "success");
          
      } finally {
          setIsSyncing(false);
      }
  };

  const fetchSession = async () => {
    try {
      setLoading(true);
      // Fetch Session & Recipe
      const { data: sessionData, error: sessionError } = await supabase
        .from('brewing_sessions')
        .select(`
          *,
          brew:brews ( name, style, recipe_data:data )
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      
      // Fetch Measurements
      const { data: measurementsData, error: measurementsError } = await supabase
          .from('brew_measurements')
          .select('*')
          .eq('session_id', sessionId)
          .order('measured_at', { ascending: true }); // Chronological order for graph

      if (measurementsError) throw measurementsError;

      const fullSession: SessionData = {
          ...sessionData,
          measurement_history: measurementsData || []
      } as unknown as SessionData;

      setSession(fullSession);
      setMeasurements(measurementsData as BrewMeasurement[] || []);
      
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
    
    // OFFLINE QUEUE
    if (!isOnline) {
        const tempId = 'temp-' + Date.now();
        const tempEvent = {
            id: tempId,
            date: event.date || new Date().toISOString(),
            createdAt: new Date().toISOString(),
            ...event
        } as TimelineEvent;
        
        // Optimistic State
        setSession(prev => prev ? { ...prev, timeline: [...(prev.timeline || []), tempEvent] } : null);
        
        setSyncQueue(prev => [...prev, { 
            type: 'ADD_EVENT', 
            payload: event, 
            tempId 
        } as any]);
        return;
    }

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
    
    setSession(prev => prev ? { ...prev, phase: newPhase } : null);

    if (!isOnline) {
       setSyncQueue(prev => [...prev, { type: 'CHANGE_PHASE', payload: newPhase }]);
       return;
    }

    try {
      await updateSessionPhase(sessionId, newPhase);
    } catch (e) {
      console.error(e);
      // Revert if failed and online? For now just log
    }
  };

  const updateMeasurement = async (id: string, updates: Partial<Pick<BrewMeasurement, 'gravity' | 'temperature' | 'pressure' | 'ph' | 'note' | 'measured_at' | 'is_og'>>) => {
      if (!session) return;
      // Optimistic update
      
      const newMeasurements = measurements.map(m => m.id === id ? { ...m, ...updates } : m);
      setMeasurements(newMeasurements);
      setSession(prev => prev ? { ...prev, measurement_history: newMeasurements } : null);

      if (!isOnline) {
          setSyncQueue(prev => [...prev, { type: 'UPDATE_MEASUREMENT', payload: { id, updates } } as any]);
          return;
      }

      try {
          const { error } = await supabase
              .from('brew_measurements')
              .update(updates)
              .eq('id', id);
          if (error) throw error;
      } catch (e) {
          console.error('Update measurement failed', e);
          fetchSession(); // revert
      }
  };

  const deleteMeasurement = async (id: string) => {
      if (!session) return;
      // Optimistic update
      const newMeasurements = measurements.filter(m => m.id !== id);
      setMeasurements(newMeasurements);
      setSession(prev => prev ? { ...prev, measurement_history: newMeasurements } : null);

      if (!isOnline) {
          setSyncQueue(prev => [...prev, { type: 'DELETE_MEASUREMENT', payload: { id } } as any]);
          return;
      }

      try {
          const { error } = await supabase
              .from('brew_measurements')
              .delete()
              .eq('id', id);
          if (error) throw error;
      } catch (e) {
          console.error('Delete measurement failed', e);
          fetchSession(); // revert
      }
  };

  const updateSessionData = async (updates: Partial<SessionData>) => {
      if (!session) return;
      
      // Filter updates to only allow specific fields to be updated directly
      const safeUpdates: any = {};
      if (updates.measurements !== undefined) safeUpdates.measurements = updates.measurements;
      if (updates.notes !== undefined) safeUpdates.notes = updates.notes;
      if (updates.measured_og !== undefined) safeUpdates.measured_og = updates.measured_og;
      if (updates.measured_fg !== undefined) safeUpdates.measured_fg = updates.measured_fg;
      if (updates.measured_abv !== undefined) safeUpdates.measured_abv = updates.measured_abv;
      if (updates.measure_volume !== undefined) safeUpdates.measure_volume = updates.measure_volume;
      if (updates.measured_efficiency !== undefined) safeUpdates.measured_efficiency = updates.measured_efficiency;
      if (updates.carbonation_level !== undefined) safeUpdates.carbonation_level = updates.carbonation_level;
      if (updates.target_og !== undefined) safeUpdates.target_og = updates.target_og;
      if (updates.batch_code !== undefined) safeUpdates.batch_code = updates.batch_code;
      if (updates.status !== undefined) safeUpdates.status = updates.status;
      if (updates.completed_at !== undefined) safeUpdates.completed_at = updates.completed_at;
      if (updates.apparent_attenuation !== undefined) safeUpdates.apparent_attenuation = updates.apparent_attenuation;

      if (Object.keys(safeUpdates).length === 0) return;

      // Optimistic Update
      setSession(prev => prev ? { ...prev, ...safeUpdates } : null);

      if (!isOnline) {
          setSyncQueue(prev => [...prev, { type: 'UPDATE_SESSION', payload: safeUpdates }]);
          return;
      }

      try {
          const { error } = await supabase
            .from('brewing_sessions')
            .update(safeUpdates)
            .eq('id', sessionId);
          
          if (error) throw error;
      } catch(e) {
          console.error("Update failed", e);
          fetchSession(); // Revert
      }
  };

  const addMeasurement = async (measurement: Partial<Omit<BrewMeasurement, 'id' | 'created_at' | 'session_id'>>) => {
      if (!session) return;
      
      const newMeasurement: any = {
          session_id: sessionId,
          brew_id: session.brew_id || null, // Ensure ID or Null
          gravity: measurement.gravity,
          temperature: measurement.temperature,
          pressure: measurement.pressure,
          ph: measurement.ph,
          note: measurement.note,
          source: measurement.source || 'manual',
          is_og: measurement.is_og || false,
          measured_at: measurement.measured_at || new Date().toISOString()
      };

      const tempId = 'temp-' + Date.now();

      // OPTIMISTIC UPDATE (Always happens)
      setMeasurements(prev => [...prev, { ...newMeasurement, id: tempId } as BrewMeasurement]);

      if (!isOnline) {
          // OFFLINE QUEUE
          setSyncQueue(prev => [...prev, { 
              type: 'ADD_MEASUREMENT', 
              payload: newMeasurement, 
              tempId, 
              timestamp: Date.now() 
          } as any]); 
          showToast("Offline gespeichert", "Daten werden gesendet, sobald du wieder online bist.", "info");
          return;
      }

      try {
          const { data, error } = await supabase
            .from('brew_measurements')
            .insert(newMeasurement)
            .select()
            .single();

          if (error) throw error;
          
          if (data) {
             setMeasurements(prev => prev.map(m => m.id === tempId ? (data as BrewMeasurement) : m));
          }
      } catch (e: any) {
          console.error("Add measurement failed", e);
          // Only revert if ONLINE (because offline logic handled above)
          if(isOnline) setMeasurements(prev => prev.filter(m => !m.id.startsWith('temp-')));
          showToast("Fehler", "Speichern fehlgeschlagen.", "warning");
      }
  };

  return (
    <SessionContext.Provider value={{ session, measurements, loading, addEvent, removeEvent, changePhase, deleteSession, refreshSession: fetchSession, updateSessionData, addMeasurement, updateMeasurement, deleteMeasurement, isOnline, isSyncing }}>
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
