'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

interface BottlesModalProps {
  brewId: string;
  brewName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function BottlesModal({ brewId, brewName, isOpen, onClose }: BottlesModalProps) {
  const [bottles, setBottles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (isOpen && brewId) {
      fetchBottles();
    }
  }, [isOpen, brewId]);

  async function fetchBottles() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('bottles')
      .select('*')
      .eq('brew_id', brewId)
      .eq('user_id', user.id)
      .order('bottle_number', { ascending: true });

    if (!error && data) {
      setBottles(data);
    }
    setLoading(false);
  }

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-cyan-500/20 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">Abgefüllte Flaschen</h2>
            <p className="text-sm text-zinc-400 mt-1">{brewName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
          ) : bottles.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 opacity-20">🍾</div>
              <p className="text-zinc-400 text-lg font-bold">Noch keine Flaschen befüllt</p>
              <p className="text-zinc-600 text-sm mt-2">Befülle deine ersten Flaschen mit diesem Rezept!</p>
            </div>
          ) : (
            <>
              <div className="mb-6 bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">🍾</div>
                  <div>
                    <p className="text-3xl font-black text-white">{bottles.length}</p>
                    <p className="text-sm text-zinc-400">{bottles.length === 1 ? 'Flasche' : 'Flaschen'} befüllt</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {bottles.map(bottle => (
                  <a 
                    key={bottle.id}
                    href={`https://botllab.vercel.app/b/${bottle.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-cyan-500/30 rounded-xl p-4 text-center transition-all duration-300"
                    onClick={onClose}
                  >
                    <div className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-300">🍾</div>
                    <div className="text-xs font-mono text-zinc-400 group-hover:text-cyan-400 transition">
                      #{bottle.bottle_number}
                    </div>
                    {bottle.filled_at && (
                      <div className="text-[10px] text-zinc-600 mt-1">
                        {new Date(bottle.filled_at).toLocaleDateString('de-DE', { 
                          day: '2-digit', 
                          month: 'short' 
                        })}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
