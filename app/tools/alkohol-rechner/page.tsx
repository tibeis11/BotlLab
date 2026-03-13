'use client';

import { useState } from 'react';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { calculateABV, platoToSG, sgToPlato, calculateABVFromSG } from '@/lib/brewing-calculations';
import { Calculator, ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';

export default function AlkoholRechner() {
  const [og, setOg] = useState<string>('12.5');
  const [fg, setFg] = useState<string>('3.2');
  const [unit, setUnit] = useState<'plato' | 'sg'>('plato');

  // Input parsing
  const parsedOg = parseFloat(og) || 0;
  const parsedFg = parseFloat(fg) || 0;

  // Calculate results based on unit
  let abv = 0;
  let apparentAttenuation = 0;
  
  if (unit === 'plato') {
    if (parsedOg > parsedFg) {
      abv = calculateABV(parsedOg, parsedFg);
      apparentAttenuation = ((parsedOg - parsedFg) / parsedOg) * 100;
    }
  } else {
    if (parsedOg > parsedFg) {
      abv = calculateABVFromSG(parsedOg, parsedFg);
      const platoOg = sgToPlato(parsedOg);
      const platoFg = sgToPlato(parsedFg);
      apparentAttenuation = ((platoOg - platoFg) / platoOg) * 100;
    }
  }

  // Formatting helpers
  const displayAbv = isNaN(abv) || abv < 0 ? 0 : abv;
  const displayAtt = isNaN(apparentAttenuation) || apparentAttenuation < 0 || apparentAttenuation > 100 ? 0 : apparentAttenuation;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 md:py-20">
        <Link href="/tools" className="inline-flex items-center text-text-secondary hover:text-brand transition-colors mb-8 text-sm font-medium">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zur Übersicht
        </Link>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Calculator className="w-6 h-6 text-orange-500" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-text-primary tracking-tight">
            Alkohol-Rechner
          </h1>
        </div>

        <p className="text-text-secondary mb-10 text-lg">
          Berechne den Alkoholgehalt (ABV - Alcohol by Volume) und den scheinbaren Vergärungsgrad deines Bieres anhand von Stammwürze und Restextrakt.
        </p>

        {/* Calculator Card */}
        <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 shadow-sm mb-10">
          
          <div className="flex justify-center mb-8">
            <div className="bg-surface-hover p-1 rounded-lg inline-flex">
              <button
                onClick={() => setUnit('plato')}
                className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${
                  unit === 'plato' ? 'bg-background shadow-sm text-text-primary border border-border' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Brix / °Plato
              </button>
              <button
                onClick={() => setUnit('sg')}
                className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${
                  unit === 'sg' ? 'bg-background shadow-sm text-text-primary border border-border' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Specific Gravity (SG)
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">
                {unit === 'plato' ? 'Stammwürze (°P)' : 'Original Gravity (SG)'}
              </label>
              <input 
                type="number"
                step={unit === 'plato' ? '0.1' : '0.001'}
                value={og}
                onChange={(e) => setOg(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent font-medium"
                placeholder={unit === 'plato' ? '12.5' : '1.050'}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">
                {unit === 'plato' ? 'Restextrakt (°P)' : 'Final Gravity (SG)'}
              </label>
              <input 
                type="number"
                step={unit === 'plato' ? '0.1' : '0.001'}
                value={fg}
                onChange={(e) => setFg(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent font-medium"
                placeholder={unit === 'plato' ? '3.2' : '1.012'}
              />
            </div>
          </div>

          {/* Results Area */}
          <div className="bg-gradient-to-br from-surface-hover to-background border border-border rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-4">Ergebnis</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-3xl md:text-5xl font-black text-brand mb-1">
                  {displayAbv.toFixed(1)}<span className="text-2xl md:text-3xl text-brand/70">%</span>
                </div>
                <div className="text-sm font-medium text-text-secondary">Alkoholgehalt (ABV)</div>
              </div>
              
              <div>
                <div className="text-3xl md:text-5xl font-black text-text-primary mb-1">
                  {displayAtt.toFixed(0)}<span className="text-2xl md:text-3xl text-text-tertiary">%</span>
                </div>
                <div className="text-sm font-medium text-text-secondary">Scheinbarer Vergärungsgrad</div>
              </div>
            </div>

            <div className="w-full bg-border h-2 rounded-full mt-6 overflow-hidden flex">
              <div 
                className="bg-brand h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(displayAtt, 100)}%` }}
              />
            </div>
          </div>

        </div>

        {/* Education Section */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 flex flex-col md:flex-row gap-4">
          <div className="flex-shrink-0">
            <Info className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h4 className="font-bold text-text-primary mb-2">Wie wird gerechnet?</h4>
            <p className="text-sm text-text-secondary leading-relaxed">
              Die BotlLab Alkoholberechnung nutzt branchenübliche Standardformeln. Der scheinbare Vergärungsgrad (Apparent Attenuation) gibt an, wie viel des verfügbaren Zuckers durch die Hefe verbraucht wurde. Ein Wert zwischen 70% und 85% ist für die meisten obergärigen Biere normal.
            </p>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}