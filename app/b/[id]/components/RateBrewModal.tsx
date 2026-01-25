import { useState, useEffect } from 'react';
import TasteSlider from './TasteSlider';
import FlavorTagSelector from './FlavorTagSelector';
import { TASTE_SLIDERS } from '@/lib/rating-config';
import { RatingSubmission } from '@/lib/types/rating';
import Link from 'next/link';

interface RateBrewModalProps {
  brewId: string;
  onSubmit: (data: RatingSubmission) => Promise<string | null>; // Returns ratingId or null
  onCancel: () => void;
  isSubmitting: boolean;
  initialAuthorName?: string;
  onClaimCap?: (ratingId: string) => Promise<void>; 
  existingRatingId?: string | null;
}

export default function RateBrewModal({ brewId, onSubmit, onCancel, isSubmitting, initialAuthorName = '', onClaimCap, existingRatingId }: RateBrewModalProps) {
  // Steps: 'rating' -> 'success'
  const [step, setStep] = useState<'rating' | 'success'>(existingRatingId ? 'success' : 'rating');
  const [createdRatingId, setCreatedRatingId] = useState<string | null>(existingRatingId || null);

  // Basic Rating State
  const [rating, setRating] = useState(0);
  const [authorName, setAuthorName] = useState(initialAuthorName);
  const [comment, setComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [honeypot, setHoneypot] = useState('');

  // Detailed Profile State
  const [showDetails, setShowDetails] = useState(false);
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

  const handleSubmit = async () => {
    if (honeypot) return; // Silent reject

    const submissionData: RatingSubmission = {
      brew_id: brewId,
      rating,
      author_name: authorName,
      comment,
      ...(showDetails ? {
          ...profile,
          appearance_color: appearanceColor as any,
          appearance_clarity: appearanceClarity as any,
      } : {})
    };

    const ratingId = await onSubmit(submissionData);
    if (ratingId) {
        setCreatedRatingId(ratingId);
        setStep('success');
    }
  };

  const updateProfile = (key: keyof RatingSubmission, value: any) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  if (step === 'success') {
      return (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                  <span className="text-4xl">✅</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Danke für dein Feedback!</h3>
              <p className="text-zinc-400 mb-8 max-w-xs mx-auto">Deine Meinung hilft anderen Brauern und Trinkern enorm weiter.</p>

              {/* Gamification CTA */}
              <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 p-6 rounded-2xl relative overflow-hidden group">
                   {/* Shine effect */}
                   <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-cyan-500/20 blur-3xl rounded-full"></div>
                  
                   <div className="relative z-10">
                        <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-2">Kronkorken verfügbar</h4>
                        <div className="text-5xl mb-4 transform group-hover:scale-110 transition duration-300">🏅</div>
                        <p className="text-sm text-zinc-300 mb-6">
                            Sammle diesen digitalen Kronkorken für deine persönliche Sammlung!
                        </p>
                        
                        <button 
                            onClick={() => onClaimCap && createdRatingId && onClaimCap(createdRatingId)}
                            className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-3 rounded-xl transition shadow-lg shadow-cyan-900/20 mb-3"
                        >
                            Kronkorken jetzt einsammeln
                        </button>
                        
                        <button 
                            onClick={onCancel}
                            className="text-xs text-zinc-500 hover:text-zinc-300 underline"
                        >
                            Nein danke, vielleicht später
                        </button>
                   </div>
              </div>
          </div>
      );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
      <div className="flex justify-between items-center mb-2">
         <h3 className="font-bold text-lg text-white">Deine Bewertung</h3>
         <button onClick={onCancel} className="text-zinc-500 hover:text-white">✕</button>
      </div>
      
      {/* Honeypot Field */}
      <input 
        type="text" 
        name="website_url_check" 
        value={honeypot}
        onChange={e => setHoneypot(e.target.value)}
        autoComplete="off"
        tabIndex={-1}
        className="opacity-0 absolute -z-10 h-0 w-0" 
      />

      {/* Stars */}
      <div>
        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Sterne</label>
        <div className="flex gap-2">
          {[1,2,3,4,5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className={`text-3xl transition ${
                star <= (hoverRating || rating) 
                  ? 'text-yellow-500 scale-110' 
                  : 'text-zinc-700'
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Dein Name</label>
        <input 
          type="text"
          placeholder="z.B. Tim"
          value={authorName}
          onChange={e => setAuthorName(e.target.value)}
          className="w-full bg-zinc-950/50 border border-zinc-800 p-3 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition text-white"
        />
      </div>

      {/* Divider for Expanded Section */}
      <div className="pt-2">
          <button 
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm font-bold text-cyan-500 hover:text-cyan-400 transition"
          >
             <span>{showDetails ? '▼' : '▶'}</span>
             <span>Geschmacksprofil {showDetails ? 'einklappen' : '(Optional)'}</span>
          </button>
      </div>

      {showDetails && (
          <div className="space-y-6 pt-4 border-t border-zinc-800 animate-in fade-in slide-in-from-top-2">
              
              {/* Sliders */}
              <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase text-zinc-500 tracking-wider">👅 Geschmack</h4>
                  {TASTE_SLIDERS.map(slider => (
                      <TasteSlider
                          key={slider.id}
                          {...slider}
                          value={profile[slider.id as keyof RatingSubmission] as number}
                          onChange={(val) => updateProfile(slider.id as keyof RatingSubmission, val)}
                      />
                  ))}
              </div>

               {/* Flavor Tags */}
               <div>
                   <h4 className="text-xs font-bold uppercase text-zinc-500 tracking-wider mb-4">🌈 Geschmacksnoten</h4>
                   <FlavorTagSelector 
                        selectedTags={profile.flavor_tags || []}
                        onChange={(tags) => updateProfile('flavor_tags', tags)}
                   />
               </div>

               {/* Appearance */}
               <div>
                   <h4 className="text-xs font-bold uppercase text-zinc-500 tracking-wider mb-4">🎨 Aussehen</h4>
                   
                   <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                           <span className="text-xs text-zinc-400">Farbe</span>
                           <div className="flex gap-2">
                               {['pale', 'amber', 'dark'].map(c => (
                                   <button 
                                      key={c}
                                      type="button"
                                      onClick={() => setAppearanceColor(c)}
                                      className={`w-8 h-8 rounded-full border-2 transition ${appearanceColor === c ? 'border-cyan-500 scale-110' : 'border-transparent opacity-50 hover:opacity-100'}
                                        ${c === 'pale' ? 'bg-[#f4d06f]' : c === 'amber' ? 'bg-[#d07b38]' : 'bg-[#4a2e16]'}
                                      `}
                                      title={c}
                                   />
                               ))}
                           </div>
                       </div>
                       
                       <div className="space-y-2">
                           <span className="text-xs text-zinc-400">Klarheit</span>
                           <div className="flex flex-wrap gap-2">
                               {[
                                   { id: 'clear', label: 'Klar' },
                                   { id: 'hazy', label: 'Trüb' },
                                   { id: 'opaque', label: 'Dicht' }
                               ].map(opt => (
                                   <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() => setAppearanceClarity(opt.id)}
                                      className={`px-3 py-1 text-xs rounded-lg border transition ${
                                          appearanceClarity === opt.id 
                                            ? 'bg-cyan-950 text-cyan-400 border-cyan-500' 
                                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                                      }`}
                                   >
                                       {opt.label}
                                   </button>
                               ))}
                           </div>
                       </div>
                   </div>
               </div>

          </div>
      )}

      {/* Comment */}
      <div className="pt-2">
        <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Kommentar (Optional)</label>
        <textarea 
          placeholder="Was hast du gedacht?"
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          className="w-full bg-zinc-950/50 border border-zinc-800 p-3 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition text-white resize-none"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !rating || !authorName.trim()}
        className="w-full bg-white text-black py-3 rounded-xl font-black hover:bg-cyan-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Wird gesendet...' : 'Bewertung absenden'}
      </button>
    </div>
  );
}
