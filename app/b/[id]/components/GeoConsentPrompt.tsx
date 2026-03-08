'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { updateScanWithGeoData } from '@/lib/actions/geo-actions';

/**
 * Phase 12.1 — GeoConsentPrompt
 *
 * Bottom-Sheet, das nach einer erfolgreichen Star-Rating-Abgabe (Tier 2)
 * einmalig erscheint. Fragt den User, ob BotlLab den ungefähren
 * Standort (Stadt + Region) speichern darf.
 *
 * Trigger-Bedingungen (alle müssen in page.tsx geprüft sein):
 * 1. Star-Rating erfolgreich submittet
 * 2. localStorage('botllab_geo_asked') nicht gesetzt
 * 3. app_mode !== 'brewer'
 * 4. ~2 Sekunden nach dem Bestätigungs-Toast
 *
 * Datenschutz:
 * - Explizites Opt-in, kein Pre-Select, kein Dark Pattern
 * - lat/lng verlassen den Client nur in Richtung /api/geo/resolve
 * - Nur Stadt + Region + Land werden persistiert
 * - localStorage-Flag verhindert erneutes Fragen
 */

interface GeoConsentPromptProps {
  bottleId: string;
  onClose: () => void;
}

type GeoState = 'asking' | 'resolving' | 'success' | 'error' | 'denied';

export default function GeoConsentPrompt({ bottleId, onClose }: GeoConsentPromptProps) {
  const [state, setState] = useState<GeoState>('asking');

  const handleConsent = async () => {
    setState('resolving');

    try {
      // 1. Browser Geolocation API
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, // Coarse location is sufficient
          timeout: 10000,
          maximumAge: 60000,         // Accept cached location up to 1 minute old
        });
      });

      const { latitude, longitude } = position.coords;

      // 2. Reverse-geocode via server route (lat/lng never stored)
      const response = await fetch('/api/geo/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: latitude, lng: longitude }),
      });

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const geoData: { city: string | null; region: string | null; country: string | null } =
        await response.json();

      // 3. Update the most recent scan with consent-based geo data
      const result = await updateScanWithGeoData(bottleId, geoData);

      if (result.success) {
        setState('success');
        localStorage.setItem('botllab_geo_asked', 'granted');
        // Auto-close after 2 seconds
        setTimeout(onClose, 2000);
      } else {
        setState('error');
        localStorage.setItem('botllab_geo_asked', 'granted'); // Don't ask again even on error
        setTimeout(onClose, 3000);
      }
    } catch (err) {
      // GeolocationPositionError has non-enumerable properties — extract them explicitly
      const geoErr = err as GeolocationPositionError | Error;
      const code = 'code' in geoErr ? geoErr.code : null;
      const message = 'message' in geoErr ? geoErr.message : String(geoErr);
      console.warn('[GeoConsent] Error (code=%s): %s', code, message);

      if (code === GeolocationPositionError.PERMISSION_DENIED) {
        // User denied browser permission — treat same as "Nein danke"
        setState('denied');
        localStorage.setItem('botllab_geo_asked', 'denied');
        setTimeout(onClose, 1500);
      } else {
        // Position unavailable or timeout — show neutral error state
        setState('error');
        localStorage.setItem('botllab_geo_asked', 'denied');
        setTimeout(onClose, 3000);
      }
    }
  };

  const handleDeny = () => {
    localStorage.setItem('botllab_geo_asked', 'denied');
    setState('denied');
    setTimeout(onClose, 800);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Standort-Freigabe"
      className="fixed bottom-0 inset-x-0 z-50 animate-in slide-in-from-bottom-4 duration-300 px-4 pb-4"
    >
      <div className="max-w-md mx-auto bg-surface border border-border rounded-2xl p-6 shadow-2xl">
        {/* ── Asking State ── */}
        {state === 'asking' && (
          <>
            <div className="flex items-start gap-3 mb-4">
              <MapPin className="w-6 h-6 shrink-0 mt-0.5 text-brand" />
              <div>
                <h3 className="font-bold text-text-primary text-sm mb-1">Standort teilen?</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Hilft dem Brauer zu sehen, wo seine Biere getrunken werden.
                  Kein GPS-Track — nur Stadt &amp; Region werden gespeichert.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleConsent}
                className="flex-1 bg-brand hover:bg-brand-hover text-black font-bold text-sm py-2.5 rounded-xl transition"
              >
                Ja, gerne
              </button>
              <button
                onClick={handleDeny}
                className="flex-1 bg-surface-hover hover:bg-border text-text-secondary font-medium text-sm py-2.5 rounded-xl transition"
              >
                Nein danke
              </button>
            </div>
          </>
        )}

        {/* ── Resolving State ── */}
        {state === 'resolving' && (
          <div className="flex items-center gap-3 py-2">
            <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-sm text-text-secondary">Standort wird ermittelt…</p>
          </div>
        )}

        {/* ── Success State ── */}
        {state === 'success' && (
          <div className="flex items-center gap-3 py-2">
            <span className="text-xl">✅</span>
            <p className="text-sm text-green-400">Danke! Standort gespeichert.</p>
          </div>
        )}

        {/* ── Error State ── */}
        {state === 'error' && (
          <div className="flex items-center gap-3 py-2">
            <span className="text-xl">⚠️</span>
            <p className="text-sm text-text-secondary">Standort konnte nicht ermittelt werden — kein Problem.</p>
          </div>
        )}

        {/* ── Denied State ── */}
        {state === 'denied' && (
          <div className="flex items-center gap-3 py-2">
            <span className="text-xl">👍</span>
            <p className="text-sm text-text-secondary">Alles klar — wird nicht nochmal gefragt.</p>
          </div>
        )}
      </div>
    </div>
  );
}
