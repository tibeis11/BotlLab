'use client';

// ============================================================================
// Phase 12.2 — Stash Button
//
// Shows on the brew page. Lets users add the brew to their digital stash
// (Kühlschrank) and optionally logs the purchase location (POS data).
// Awards +5 Tasting IQ for providing purchase location.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  addToStash,
  removeFromStash,
  isInStash,
  type PurchaseLocation,
} from '@/lib/actions/stash-actions';
import { PURCHASE_LOCATION_LABELS } from '@/lib/stash-config';
import { useAuth } from '@/app/context/AuthContext';

interface StashButtonProps {
  brewId: string;
  brewName: string;
}

type ModalStep = 'location' | 'success';

const LOCATIONS = Object.entries(PURCHASE_LOCATION_LABELS) as [PurchaseLocation, string][];

export default function StashButton({ brewId, brewName }: StashButtonProps) {
  const { user } = useAuth();
  const [inStash, setInStash] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<ModalStep>('location');
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<PurchaseLocation | null>(null);

  // Check stash status once logged in
  useEffect(() => {
    if (!user) return;
    isInStash(brewId)
      .then(setInStash)
      .catch((err: any) => {
        console.error('[StashButton] isInStash error:', err);
      });
  }, [user, brewId]);

  // Phase 7.1: Escape-Key schließt das Modal
  useEffect(() => {
    if (!showModal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowModal(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showModal]);

  if (!user) return null;

  async function handleAdd(location: PurchaseLocation | null) {
    setLoading(true);
    try {
      const result = await addToStash(brewId, location, null);
      if (result.success) {
        setInStash(true);
        setStep('success');
      } else {
        toast.error('Hinzufügen zum Stash fehlgeschlagen. Versuche es nochmal.');
      }
    } catch (err: any) {
      console.error('[StashButton] handleAdd error:', err);
      toast.error('Fehler beim Stash-Hinzufügen: ' + (err?.message ?? 'Unbekannter Fehler'));
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    setLoading(true);
    try {
      await removeFromStash(brewId);
      setInStash(false);
    } catch (err: any) {
      console.error('[StashButton] handleRemove error:', err);
      toast.error('Fehler beim Entfernen aus dem Stash.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Trigger button — Tier 4: Card-Style */}
      {inStash ? (
        <button
          onClick={handleRemove}
          disabled={loading}
          className="w-full flex items-center gap-4 bg-emerald-900/20 border border-emerald-700/40 rounded-2xl px-5 py-4 text-left hover:bg-emerald-900/30 transition-colors disabled:opacity-50 group"
        >
          <span className="text-2xl shrink-0">🥶</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-emerald-400 leading-snug">Im Keller gespeichert</p>
            <p className="text-[11px] text-text-muted mt-0.5">Tippen zum Entfernen</p>
          </div>
          <svg className="w-4 h-4 text-text-disabled shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      ) : (
        <button
          onClick={() => {
            setStep('location');
            setSelectedLocation(null);
            setShowModal(true);
          }}
          disabled={loading}
          className="w-full flex items-center gap-4 bg-surface/60 border border-border rounded-2xl px-5 py-4 text-left hover:bg-surface-hover/60 transition-colors disabled:opacity-50 group"
        >
          <span className="text-2xl shrink-0">🗂️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-secondary leading-snug group-hover:text-text-primary transition-colors">In meinen Keller legen</p>
            <p className="text-[11px] text-text-muted mt-0.5">Speichere Biere, die du kennst &amp; liebst · <span className="text-brand">+5 IQ</span></p>
          </div>
          <svg className="w-4 h-4 text-text-disabled shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      )}

      {/* Modal overlay */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div role="dialog" aria-modal="true" aria-label="In Stash hinzufügen" className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">

            {step === 'location' ? (
              <>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-black tracking-[0.2em] text-brand">
                    Stash
                  </p>
                  <h3 className="text-xl font-black text-text-primary">
                    Wo hast du diesen Schatz gehoben?
                  </h3>
                  <p className="text-xs text-text-muted">
                    Optional — du bekommst <span className="text-brand font-bold">+5 Tasting IQ</span> für die Angabe.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {LOCATIONS.map(([loc, label]) => (
                    <button
                      key={loc}
                      onClick={() => {
                        setSelectedLocation(loc);
                        handleAdd(loc);
                      }}
                      disabled={loading}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium text-left transition-all ${
                        selectedLocation === loc
                          ? 'border-brand bg-brand/10 text-text-primary'
                          : 'border-border text-text-secondary hover:border-border-hover hover:text-text-primary'
                      } disabled:opacity-50`}
                    >
                      <span className="text-lg">{label.split(' ')[0]}</span>
                      <span>{label.split(' ').slice(1).join(' ')}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handleAdd(null)}
                  disabled={loading}
                  className="w-full text-center text-xs text-text-disabled hover:text-text-secondary transition-colors py-1"
                >
                  Überspringen (kein Bonus)
                </button>
              </>
            ) : (
              // Success step
              <div className="flex flex-col items-center text-center space-y-4 py-4">
                <span className="text-5xl">🥶</span>
                <div className="space-y-1.5">
                  <p className="text-xl font-black text-text-primary">Im Stash!</p>
                  <p className="text-sm text-text-secondary">
                    <span className="font-semibold text-text-primary">{brewName}</span> liegt jetzt kalt.
                  </p>
                  {selectedLocation && (
                    <p className="text-xs text-brand font-bold">+5 Tasting IQ gutgeschrieben 🧠</p>
                  )}
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="mt-2 bg-surface-hover text-text-primary text-sm font-medium rounded-xl px-6 py-2.5 hover:bg-border transition-all"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
