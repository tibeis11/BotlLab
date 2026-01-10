'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user has already acknowledged
    const consented = localStorage.getItem('botllab-cookie-consent');
    if (!consented) {
      setShow(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('botllab-cookie-consent', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-zinc-950/95 backdrop-blur border-t border-zinc-800 p-4 md:p-6 animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-zinc-300 text-sm leading-relaxed text-center md:text-left">
          <p>
            🍪 <strong>Nur das Nötigste:</strong> Wir nutzen ausschließlich essenzielle Cookies, 
            damit Login und Funktionen sicher laufen. Keine Tracker, keine Werbung. 
            Mehr dazu in unserer{' '}
            <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300 hover:underline">
              Datenschutzerklärung
            </Link>.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="whitespace-nowrap bg-white text-black font-bold px-6 py-2.5 rounded-full hover:bg-cyan-400 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          Alles klar
        </button>
      </div>
    </div>
  );
}
