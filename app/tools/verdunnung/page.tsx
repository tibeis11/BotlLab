'use client';

import { useState } from 'react';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { Droplet, ArrowLeft, Info, Beaker } from 'lucide-react';
import Link from 'next/link';

export default function VerdunnungsRechner() {
  const [currentVolume, setCurrentVolume] = useState<string>('20');
  const [currentOg, setCurrentOg] = useState<string>('14.0');
  const [targetOg, setTargetOg] = useState<string>('12.0');
  
  const parsedVolume = parseFloat(currentVolume) || 0;
  const parsedCurrentOg = parseFloat(currentOg) || 0;
  const parsedTargetOg = parseFloat(targetOg) || 0;

  let addedWater = 0;
  let finalVolume = 0;

  if (parsedVolume > 0 && parsedTargetOg > 0 && parsedCurrentOg > parsedTargetOg) {
    // Mischkreuz Formel für Verdünnung: 
    // Zusatzwasser = Aktuelles Volumen * (Aktuelle SW - Ziel SW) / Ziel SW
    addedWater = parsedVolume * (parsedCurrentOg - parsedTargetOg) / parsedTargetOg;
    finalVolume = parsedVolume + addedWater;
  }

  // Formatting helpers
  const displayAddedWater = isNaN(addedWater) || addedWater < 0 ? 0 : addedWater;
  const displayFinalVolume = isNaN(finalVolume) || finalVolume < parsedVolume ? parsedVolume : finalVolume;

  const validTarget = parsedTargetOg <= parsedCurrentOg && parsedTargetOg > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 md:py-20">
        <Link href="/tools" className="inline-flex items-center text-text-secondary hover:text-brand transition-colors mb-8 text-sm font-medium">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zur Übersicht
        </Link>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <Droplet className="w-6 h-6 text-teal-500" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-text-primary tracking-tight">
            Verdünnungs-Rechner
          </h1>
        </div>

        <p className="text-text-secondary mb-10 text-lg">
          Die gemessene Stammwürze ist zu hoch? Berechne ganz einfach mit dem Mischkreuz, wie viel Wasser du hinzufügen musst, um deine Zielstammwürze zu treffen.
        </p>

        {/* Input Card */}
        <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 shadow-sm mb-10">

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="relative">
              <label className="block text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                <Beaker className="w-4 h-4 text-text-muted" />
                Aktuelle Menge (L)
              </label>
              <input 
                type="number"
                step="0.5"
                value={currentVolume}
                onChange={(e) => setCurrentVolume(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent font-medium"
                placeholder="20"
              />
            </div>
            
            <div className="relative">
              <label className="block text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                Aktuelle SW (°P)
              </label>
              <input 
                type="number"
                step="0.1"
                value={currentOg}
                onChange={(e) => setCurrentOg(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent font-medium"
                placeholder="14.0"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                Ziel-Stammwürze (°P)
              </label>
              <input 
                type="number"
                step="0.1"
                value={targetOg}
                onChange={(e) => setTargetOg(e.target.value)}
                className={`w-full bg-background border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent font-medium ${
                  !validTarget && targetOg !== '' ? 'border-red-500 focus:ring-red-500' : 'border-border'
                }`}
                placeholder="12.0"
              />
            </div>
          </div>

          {!validTarget && targetOg !== '' && parsedCurrentOg > 0 && (
            <div className="mb-6 text-sm text-red-500 font-medium bg-red-500/10 px-4 py-2 rounded-lg inline-block">
              Die Zielstammwürze muss kleiner sein als die aktuelle Stammwürze.
            </div>
          )}

          {/* Results Area */}
          <div className="bg-gradient-to-br from-teal-500/10 to-transparent border border-teal-500/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 w-full text-center md:text-left">
              <h3 className="text-sm font-bold text-teal-600 uppercase tracking-wider mb-2">Wasser zugeben</h3>
              <div className="text-4xl md:text-6xl font-black text-text-primary flex items-baseline justify-center md:justify-start">
                +{displayAddedWater.toFixed(2)} <span className="text-2xl font-bold text-text-tertiary ml-2">Liter</span>
              </div>
            </div>

            <div className="hidden md:block w-px h-24 bg-border/50"></div>

            <div className="flex-1 w-full text-center md:text-right">
              <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">Neues Gesamtvolumen</h3>
              <div className="text-3xl md:text-4xl font-bold text-text-primary flex items-baseline justify-center md:justify-end">
                {displayFinalVolume.toFixed(2)} <span className="text-xl font-semibold text-text-tertiary ml-2">Liter</span>
              </div>
            </div>
          </div>

        </div>

        {/* Education Section */}
        <div className="bg-teal-500/5 border border-teal-500/20 rounded-2xl p-6 flex flex-col md:flex-row gap-4">
          <div className="flex-shrink-0">
            <Info className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h4 className="font-bold text-text-primary mb-2">Hinweis zur Wasserzugabe</h4>
            <p className="text-sm text-text-secondary leading-relaxed">
              Dieser Rechner geht von einer linearen Verdünnung aus (Mischkreuz), die bei °Plato / Gewichts-Prozenten sehr exakt ist. Denke daran, abgekochtes oder steriles Wasser zu verwenden, um keine Infektion im fertigen Bier zu riskieren.
            </p>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}