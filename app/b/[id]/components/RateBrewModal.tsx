'use client';

import { useState, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import FlavorTagSelector from './FlavorTagSelector';
import { RatingSubmission } from '@/lib/types/rating';
import Link from 'next/link';
import { CheckCircle, Award, X, Star } from 'lucide-react';

interface RateBrewModalProps {
  brewId: string;
  onSubmit: (data: RatingSubmission & { form_start_time?: number }) => Promise<string | null>; // Returns ratingId or null
  onCancel: () => void;
  isSubmitting: boolean;
  initialAuthorName?: string;
  onClaimCap?: (ratingId: string) => Promise<void>; 
  existingRatingId?: string | null;
  currentUser?: User | null;
  /** Phase 12.1: Called after a NEW star-rating is successfully submitted (not for existing ratings) */
  onRatingComplete?: () => void;
}

export default function RateBrewModal({ 
  brewId, 
  onSubmit, 
  onCancel, 
  isSubmitting, 
  initialAuthorName = '', 
  onClaimCap, 
  existingRatingId,
  currentUser,
  onRatingComplete,
}: RateBrewModalProps) {
  // Steps: 'rating' -> 'success'
  const [step, setStep] = useState<'rating' | 'success'>(existingRatingId ? 'success' : 'rating');
  const [createdRatingId, setCreatedRatingId] = useState<string | null>(existingRatingId || null);

  // Spam Protection: Measure time to complete form
  const formStartTime = useRef(Date.now());

  // Basic Rating State
  const [rating, setRating] = useState(0);
  const [authorName, setAuthorName] = useState(initialAuthorName);
  const [comment, setComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [honeypot, setHoneypot] = useState('');

  // Detailed Profile State
  const [profile, setProfile] = useState<Partial<RatingSubmission>>({
    flavor_tags: [],
    // Initialize to undefined so we know if user skipped them
    taste_bitterness: undefined,
    taste_sweetness: undefined,
    taste_body: undefined,
    taste_carbonation: undefined,
    taste_acidity: undefined,
    aroma_intensity: undefined,
  });

  // Appearance State
  const [appearanceColor, setAppearanceColor] = useState<string | undefined>(undefined);
  const [appearanceClarity, setAppearanceClarity] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (existingRatingId) {
      setStep('success');
      setCreatedRatingId(existingRatingId);
    }
  }, [existingRatingId]);

  // Pre-fill Name from User if available and empty
  useEffect(() => {
    if (currentUser?.user_metadata?.display_name && !authorName) {
        setAuthorName(currentUser.user_metadata.display_name);
    } else if (currentUser?.user_metadata?.full_name && !authorName) {
        setAuthorName(currentUser.user_metadata.full_name);
    }
  }, [currentUser]);

  // Phase 7.1: Escape-Key schließt Modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSubmit = async () => {
    if (honeypot) return; // Silent reject

    const submissionData: RatingSubmission & { form_start_time?: number } = {
      brew_id: brewId,
      rating,
      author_name: authorName,
      comment,
      form_start_time: formStartTime.current,
      ...profile,
      appearance_color: appearanceColor as any,
      appearance_clarity: appearanceClarity as any,
    };

    const ratingId = await onSubmit(submissionData);
    if (ratingId) {
        setCreatedRatingId(ratingId);
        setStep('success');
        // Phase 12.1: Notify parent that a new rating was submitted
        onRatingComplete?.();
    }
  };

  const updateProfile = (key: keyof RatingSubmission, value: any) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  if (step === 'success') {
      return (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                  <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-2xl font-black text-text-primary mb-2">Danke für dein Feedback!</h3>
              <p className="text-text-secondary mb-8 max-w-xs mx-auto">Deine Meinung hilft anderen Brauern und Trinkern enorm weiter.</p>

              {/* Gamification CTA - Only show if NO user is logged in (Guests) */}
              {/* If user IS logged in, we auto-claimed it already, so we just show success or "View Profile" */}
              
              {!currentUser ? (
                  <div className="bg-surface-hover border border-border p-6 rounded-2xl relative overflow-hidden group">
                       {/* Shine effect */}
                       <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-brand/20 blur-3xl rounded-full"></div>
                      
                       <div className="relative z-10">
                            <h4 className="text-sm font-bold text-brand uppercase tracking-widest mb-2">Kronkorken verfügbar</h4>
                            <div className="flex justify-center mb-4 transform group-hover:scale-110 transition duration-300"><Award className="w-12 h-12 text-amber-400" /></div>
                            <p className="text-sm text-text-secondary mb-6">
                                Sammle diesen digitalen Kronkorken für deine persönliche Sammlung!
                            </p>
                            
                            <button 
                                onClick={() => onClaimCap && createdRatingId && onClaimCap(createdRatingId)}
                                className="w-full bg-brand hover:bg-brand-hover text-black font-black py-3 rounded-xl transition shadow-lg mb-3"
                            >
                                Kronkorken jetzt einsammeln
                            </button>
                            
                            <button 
                                onClick={onCancel}
                                className="text-xs text-text-muted hover:text-text-secondary underline"
                            >
                                Nein danke, vielleicht später
                            </button>
                       </div>
                  </div>
              ) : (
                  <div className="bg-surface border border-border p-6 rounded-2xl">
                       <p className="text-text-secondary mb-4">
                           Der Kronkorken wurde automatisch deiner Sammlung hinzugefügt! 🏅
                       </p>
                       <div className="flex flex-col gap-3">
                           <button 
                                onClick={onCancel}
                                className="w-full bg-surface-hover hover:bg-border text-text-primary font-bold py-3 rounded-xl transition"
                           >
                               Fenster schließen
                           </button>
                       </div>
                  </div>
              )}
          </div>
      );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ratemodal-title"
      className="bg-surface border border-border rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 id="ratemodal-title" className="text-sm font-black uppercase tracking-widest text-text-primary">Deine Bewertung</h3>
        <button onClick={onCancel} aria-label="Schließen" className="text-text-disabled hover:text-text-primary transition p-1 -mr-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Honeypot */}
      <input type="text" name="website_url_check" value={honeypot} onChange={e => setHoneypot(e.target.value)} autoComplete="off" tabIndex={-1} className="opacity-0 absolute -z-10 h-0 w-0" />

      <div className="px-5 py-4 space-y-5">

        {/* Sterne */}
        <div>
          <p className="text-[10px] uppercase font-bold tracking-widest text-text-muted mb-3">Deine Sterne</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                aria-label={`Mit ${star} von 5 Sternen bewerten`}
                aria-pressed={star <= rating}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform active:scale-90"
              >
                <Star className={`w-9 h-9 transition-colors ${
                  star <= (hoverRating || rating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-none text-border'
                }`} />
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-widest text-text-muted mb-2">Dein Name</label>
          <input
            type="text"
            placeholder="z.B. Tim"
            value={authorName}
            onChange={e => setAuthorName(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition"
          />
        </div>

        {/* Geschmacksnoten */}
        <div>
          <p className="text-[10px] uppercase font-bold tracking-widest text-text-muted mb-2">Geschmacksnoten</p>
          <FlavorTagSelector
            selectedTags={profile.flavor_tags || []}
            onChange={(tags) => updateProfile('flavor_tags', tags)}
            compact
            maxSelection={3}
          />
        </div>

        {/* Aussehen */}
        <div>
          <p className="text-[10px] uppercase font-bold tracking-widest text-text-muted mb-3">Aussehen</p>
          <div className="flex items-start gap-6">
            {/* Farbe */}
            <div>
              <p className="text-[10px] text-text-disabled mb-2">Farbe</p>
              <div className="flex gap-2">
                {[
                  { id: 'pale',  color: '#f4d06f', label: 'Hell' },
                  { id: 'amber', color: '#d07b38', label: 'Bernstein' },
                  { id: 'dark',  color: '#4a2e16', label: 'Dunkel' },
                ].map(c => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.label}
                    onClick={() => setAppearanceColor(c.id)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      appearanceColor === c.id
                        ? 'border-brand scale-110 shadow-[0_0_0_3px_rgba(6,182,212,0.2)]'
                        : 'border-border opacity-60 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.color }}
                  />
                ))}
              </div>
            </div>
            {/* Klarheit */}
            <div>
              <p className="text-[10px] text-text-disabled mb-2">Klarheit</p>
              <div className="flex gap-1.5">
                {[
                  { id: 'clear',  label: 'Klar' },
                  { id: 'hazy',   label: 'Trüb' },
                  { id: 'opaque', label: 'Dicht' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAppearanceClarity(opt.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition ${
                      appearanceClarity === opt.id
                        ? 'bg-brand/10 text-brand border-brand/40'
                        : 'bg-background text-text-muted border-border hover:border-border-hover hover:text-text-secondary'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Kommentar */}
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-widest text-text-muted mb-2">Kommentar <span className="normal-case tracking-normal font-normal text-text-disabled">(optional)</span></label>
          <textarea
            placeholder="Was hast du gedacht?"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition resize-none"
          />
        </div>

      </div>

      {/* Footer */}
      <div className="px-5 pb-5">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !rating || !authorName.trim()}
          className="w-full bg-brand text-black font-black text-sm py-3 rounded-xl hover:bg-brand-hover active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Wird gesendet…' : 'Bewertung absenden'}
        </button>
      </div>
    </div>
  );
}
