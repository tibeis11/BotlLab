'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface BottlesModalProps {
  isOpen: boolean;
  onClose: () => void;
  brewId: string;
  brewName: string;
}

export default function BottlesModal({ isOpen, onClose, brewId, brewName }: BottlesModalProps) {
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(1);
  const [size, setSize] = useState('0.33');

  if (!isOpen) return null;

  async function handleFill() {
    setLoading(true);
    // Placeholder logic - we need to know the correct table structure
    // Assuming 'bottles' table exists and links to brew_id
    /*
    const { error } = await supabase.from('bottles').insert({
        brew_id: brewId,
        size_l: parseFloat(size),
        count: count,
        status: 'filled'
    });
    */
   
    // Simulating success for now until we restore full logic
    setTimeout(() => {
        setLoading(false);
        onClose();
        alert(`🚧 Feature wird gewartet: ${count}x ${size}l für "${brewName}" (Simuliert)`);
    }, 500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition"
        >
          ✕
        </button>

        <h3 className="text-2xl font-black text-white mb-1">Abfüllen 🍾</h3>
        <p className="text-zinc-500 text-sm mb-6">Fülle <span className="text-cyan-400 font-bold">{brewName}</span> in Flaschen ab.</p>

        <div className="space-y-4">
             <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Größe (Liter)</label>
                <div className="grid grid-cols-3 gap-2">
                    {['0.33', '0.5', '0.75'].map(s => (
                        <button key={s} onClick={() => setSize(s)} className={`py-2 rounded-xl border font-bold text-sm transition ${size === s ? 'bg-white text-black border-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>
                            {s}l
                        </button>
                    ))}
                </div>
             </div>

             <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Anzahl</label>
                <div className="flex items-center gap-4 bg-zinc-950 border border-zinc-800 rounded-xl p-2">
                    <button onClick={() => setCount(Math.max(1, count - 1))} className="w-10 h-10 flex items-center justify-center bg-zinc-900 rounded-lg text-white hover:bg-zinc-800 font-bold">-</button>
                    <div className="flex-1 text-center font-mono text-2xl font-bold">{count}</div>
                    <button onClick={() => setCount(count + 1)} className="w-10 h-10 flex items-center justify-center bg-zinc-900 rounded-lg text-white hover:bg-zinc-800 font-bold">+</button>
                </div>
             </div>

             <button 
                onClick={handleFill} 
                disabled={loading}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-4 rounded-xl transition flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-wait"
            >
                {loading ? 'Fülle ab...' : 'Flaschen ins Inventar 📦'}
             </button>
        </div>
      </div>
    </div>
  );
}
