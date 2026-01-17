import { supabase } from './supabase';
import { TimelineEvent, SessionPhase, MeasurementLogEntry } from './types/session-log';

/**
 * Adds a new event to the session timeline using the atomic RPC function.
 * Generates an ID and timestamps if not provided.
 */
export async function addTimelineEvent(
  sessionId: string, 
  event: Omit<TimelineEvent, 'id' | 'date' | 'createdAt'> & { date?: string }
): Promise<TimelineEvent[]> {
  
  // 1. Prepare complete event object
  const newEvent: TimelineEvent = {
    ...event,
    id: crypto.randomUUID(), // Standard Web API
    date: event.date || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    // Base properties might be missing in input, ensure they exist
    title: event.title || '',
    description: event.description || '',
    data: event.data || {},
  } as TimelineEvent;

  // 2. Call the RPC function defined in migration 20260115160000
  const { data, error } = await supabase
    .rpc('append_timeline_entry', {
      p_session_id: sessionId,
      p_new_entry: newEvent
    });

  if (error) {
    console.error('Error appending timeline entry:', error);
    throw new Error(error.message);
  }

  return data as TimelineEvent[];
}

/**
 * Removes an event from the timeline.
 */
export async function removeTimelineEvent(sessionId: string, eventId: string): Promise<TimelineEvent[]> {
    // 1. Fetch current timeline
    const { data: session, error: fetchError } = await supabase
        .from('brewing_sessions')
        .select('timeline')
        .eq('id', sessionId)
        .single();
    
    if (fetchError) throw fetchError;
    
    // 2. Filter out the event
    const currentTimeline = (session?.timeline || []) as TimelineEvent[];
    const updatedTimeline = currentTimeline.filter(e => e.id !== eventId);
    
    // 3. Update the row
    const { data, error: updateError } = await supabase
        .from('brewing_sessions')
        .update({ timeline: updatedTimeline })
        .eq('id', sessionId)
        .select('timeline')
        .single();
        
    if (updateError) throw updateError;
    return (data.timeline || []) as TimelineEvent[];
}

/**
 * Updates the high-level phase of the brewing session.
 */
export async function updateSessionPhase(sessionId: string, phase: SessionPhase) {
  const { error } = await supabase
    .from('brewing_sessions')
    .update({ phase })
    .eq('id', sessionId);
  
  if (error) throw error;
}

import { calculateABVFromSG } from './brewing-calculations';

// ... (existing imports)

/**
 * Calculates the current ABV based on the latest OG and SG/FG measurements in the timeline.
 * Returns null if data is insufficient.
 */
export function calculateCurrentStats(timeline: TimelineEvent[]) {
  // FIND LATEST EVENTS
  const byDate = (a: TimelineEvent, b: TimelineEvent) => new Date(b.date).getTime() - new Date(a.date).getTime();

  // 1. OG
  const ogEvent = timeline
    .filter(e => e.type === 'MEASUREMENT_OG')
    .sort(byDate)[0] as MeasurementLogEntry | undefined;

  // 2. Current Gravity (SG or FG)
  const currentGravEvent = timeline
    .filter(e => e.type === 'MEASUREMENT_SG' || e.type === 'MEASUREMENT_FG')
    .sort(byDate)[0] as MeasurementLogEntry | undefined;

  // 3. Volume
  const volEvent = timeline
    .filter(e => e.type === 'MEASUREMENT_VOLUME')
    .sort(byDate)[0] as MeasurementLogEntry | undefined;

  // 4. pH
  const phEvent = timeline
    .filter(e => e.type === 'MEASUREMENT_PH')
    .sort(byDate)[0] as MeasurementLogEntry | undefined;

  
  let abv = null;
  let attenuation = null;

  const og = ogEvent?.data.gravity || null;
  const sg = currentGravEvent?.data.gravity || null;

  if (og && sg) {
      // Centralized ABV Calculation
      abv = parseFloat(calculateABVFromSG(og, sg).toFixed(2));
      // Apparent Attenuation: (OG - FG) / (OG - 1)
      attenuation = parseFloat(((og - sg) / (og - 1) * 100).toFixed(1));
  }

  return {
    abv,
    attenuation,
    og,
    currentGravity: sg,
    volume: volEvent?.data.volume || null,
    ph: phEvent?.data.ph || null
  };
}
