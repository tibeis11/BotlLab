'use client';

import { useState, useMemo } from 'react';
import { formatDate, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

// Phase 10: Detected event type (defined here instead of importing from 'use server' file)
export type DetectedEvent = {
  id: string;
  createdAt: string;
  eventStart: string;
  eventEnd: string;
  city: string | null;
  countryCode: string | null;
  totalScans: number;
  uniqueSessions: number;
  uniqueBrews: number;
  eventType: 'tasting' | 'festival' | 'party' | 'meetup' | 'unknown';
  confidence: number;
  brewerLabel: string | null;
  brewerNotes: string | null;
  centerLat: number;
  centerLng: number;
  radiusM: number | null;
  brewIds: string[];
  breweries: string[];
};

// Event type configuration
const EVENT_TYPE_CONFIG: Record<string, { emoji: string; label: string; color: string; bgColor: string }> = {
  tasting:  { emoji: '🍻', label: 'Tasting',  color: '#f59e0b', bgColor: 'bg-amber-500/10 border-amber-500/20' },
  festival: { emoji: '🎉', label: 'Festival', color: '#ef4444', bgColor: 'bg-red-500/10 border-red-500/20' },
  party:    { emoji: '🎈', label: 'Party',    color: '#ec4899', bgColor: 'bg-pink-500/10 border-pink-500/20' },
  meetup:   { emoji: '🤝', label: 'Meetup',   color: '#8b5cf6', bgColor: 'bg-violet-500/10 border-violet-500/20' },
  unknown:  { emoji: '📍', label: 'Event',    color: '#6b7280', bgColor: 'bg-zinc-500/10 border-zinc-500/20' },
};

interface EventDetailPanelProps {
  event: DetectedEvent;
  brewNames?: Record<string, string>; // brew_id → brew name
  onAnnotate?: (eventId: string, label: string, notes: string) => Promise<void>;
  onClose?: () => void;
  monthlyScans?: number; // For comparison text
}

export default function EventDetailPanel({ 
  event, 
  brewNames = {}, 
  onAnnotate, 
  onClose,
  monthlyScans 
}: EventDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(event.brewerLabel || '');
  const [notes, setNotes] = useState(event.brewerNotes || '');
  const [saving, setSaving] = useState(false);

  const config = EVENT_TYPE_CONFIG[event.eventType] || EVENT_TYPE_CONFIG.unknown;

  const formattedStart = formatDate(new Date(event.eventStart), 'dd. MMMM yyyy, HH:mm', { locale: de });
  const formattedEnd = formatDate(new Date(event.eventEnd), 'HH:mm', { locale: de }) + ' Uhr';
  const timeAgo = formatDistanceToNow(new Date(event.eventStart), { locale: de, addSuffix: true });

  // Calculate event duration in hours
  const durationHours = useMemo(() => {
    const start = new Date(event.eventStart).getTime();
    const end = new Date(event.eventEnd).getTime();
    return Math.round((end - start) / 3_600_000 * 10) / 10;
  }, [event.eventStart, event.eventEnd]);

  // Monthly scan comparison
  const monthlyPct = monthlyScans && monthlyScans > 0
    ? Math.round((event.totalScans / monthlyScans) * 1000) / 10
    : null;

  const handleSave = async () => {
    if (!onAnnotate) return;
    setSaving(true);
    try {
      await onAnnotate(event.id, label, notes);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save annotation:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-black border border-zinc-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{config.emoji}</span>
          <div>
            <h3 className="text-white font-semibold text-sm">
              {event.brewerLabel || `${config.label} erkannt`}
            </h3>
            <p className="text-zinc-500 text-xs mt-0.5">{timeAgo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span 
            className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${config.bgColor}`}
            style={{ color: config.color }}
          >
            {config.label} — {Math.round(event.confidence * 100)}%
          </span>
          {onClose && (
            <button 
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-4 gap-px bg-zinc-800">
        <div className="bg-zinc-900 p-3 text-center">
          <p className="text-white font-mono font-bold text-lg">{event.totalScans}</p>
          <p className="text-zinc-500 text-[10px] uppercase tracking-wider mt-0.5">Scans</p>
        </div>
        <div className="bg-zinc-900 p-3 text-center">
          <p className="text-white font-mono font-bold text-lg">{event.uniqueSessions}</p>
          <p className="text-zinc-500 text-[10px] uppercase tracking-wider mt-0.5">Personen</p>
        </div>
        <div className="bg-zinc-900 p-3 text-center">
          <p className="text-white font-mono font-bold text-lg">{event.uniqueBrews}</p>
          <p className="text-zinc-500 text-[10px] uppercase tracking-wider mt-0.5">Biere</p>
        </div>
        <div className="bg-zinc-900 p-3 text-center">
          <p className="text-white font-mono font-bold text-lg">{durationHours}h</p>
          <p className="text-zinc-500 text-[10px] uppercase tracking-wider mt-0.5">Dauer</p>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 space-y-4">
        {/* Time & Location */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500">🕐</span>
            <span className="text-zinc-300">{formattedStart} – {formattedEnd}</span>
          </div>
          {event.city && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">📍</span>
              <span className="text-zinc-300">
                {event.city}{event.countryCode ? `, ${event.countryCode}` : ''}
              </span>
            </div>
          )}
          {event.radiusM && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">⭕</span>
              <span className="text-zinc-300">
                Radius: ~{event.radiusM >= 1000 ? `${(event.radiusM / 1000).toFixed(1)} km` : `${event.radiusM} m`}
              </span>
            </div>
          )}
        </div>

        {/* Brew Distribution */}
        {event.brewIds.length > 0 && (
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2">Gescannte Biere</p>
            <div className="space-y-1">
              {event.brewIds.map((brewId) => (
                <div key={brewId} className="flex items-center gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                  <span className="text-zinc-300">{brewNames[brewId] || brewId.slice(0, 8) + '…'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly comparison */}
        {monthlyPct !== null && (
          <div className="bg-zinc-800/50 rounded-md p-3 border border-zinc-700/50">
            <p className="text-zinc-400 text-xs">
              Dieses Event brachte <span className="text-cyan-400 font-medium">{event.totalScans} Scans</span> — 
              das sind <span className="text-white font-medium">{monthlyPct}%</span> deiner monatlichen Scans
              {durationHours < 24 ? ` an einem einzigen ${durationHours < 4 ? 'Nachmittag' : 'Tag'}` : ''}.
            </p>
          </div>
        )}

        {/* Brewer Annotation */}
        <div className="border-t border-zinc-800 pt-3">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Event-Name (z.B. Tag der offenen Tür)"
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
              />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notizen zum Event..."
                rows={2}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1 bg-white text-black text-xs font-medium rounded hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Speichern…' : 'Speichern'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 text-zinc-400 text-xs hover:text-zinc-200 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 text-zinc-500 text-xs hover:text-zinc-300 transition-colors"
            >
              <span>✏️</span>
              <span>{event.brewerLabel ? 'Event umbenennen' : 'Event benennen'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
