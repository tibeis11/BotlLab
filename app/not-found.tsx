'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 text-center">
      <span className="text-6xl mb-6">🧭</span>
      <h1 className="text-4xl font-black mb-4">404 - Seite nicht gefunden</h1>
      <p className="text-zinc-500 max-w-md mx-auto mb-8">
        Hoppla! Die Seite, die du suchst, scheint sich in Luft aufgelöst zu haben – oder wurde vielleicht schon ausgetrunken?
      </p>
      <Link 
        href="/"
        className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-8 py-3 rounded-xl transition"
      >
        Zurück zur Übersicht
      </Link>
    </div>
  );
}
