'use client';

import { useState } from 'react';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { calculatePrimingSugar, calculateResidualCO2 } from '@/lib/brewing-calculations';
import { Waves, ArrowLeft, Info, Thermometer, Database } from 'lucide-react';
import Link from 'next/link';

export default function KarbonisierungRechner() {
  const [volume, setVolume] = useState<string>('20');
  const [temp, setTemp] = useState<string>('20');
  const [co2, setCo2] = useState<string>('5.0');
  
  const parsedVolume = parseFloat(volume) || 0;
  const parsedTemp = parseFloat(temp) || 0;
  const parsedCo2 = parseFloat(co2) || 0;

  let sugarAmount = 0;
  let remainingCo2 = 0;

  if (parsedVolume > 0 && parsedTemp > 0 && parsedCo2 > 0) {
    sugarAmount = calculatePrimingSugar(parsedVolume, parsedTemp, parsedCo2);
    remainingCo2 = calculateResidualCO2(parsedTemp);
  }

  // Display overrides
  const displaySugar = isNaN(sugarAmount) || sugarAmount < 0 ? 0 : sugarAmount;
  const displayRemaining = isNaN(remainingCo2) || remainingCo2 < 0 ? 0 : remainingCo2;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 md:py-20">
        <Link href="/tools" className="inline-flex items-center text-text-secondary hover:text-brand transition-colors mb-8 text-sm font-medium">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zur Übersicht
        </Link>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Waves className="w-6 h-6 text-blue-500" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-text-primary tracking-tight">
            Karbonisierungs-Rechner
          </h1>
        </div>

        <p className="text-text-secondary mb-10 text-lg">
          Bestimme präzise die benötigte Menge an Haushaltszucker für die Nachgärung in der Flasche, um die gewünschte Kohlensäure (CO₂) zu erreichen.
        </p>

        {/* Form Container */}
        <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 shadow-sm mb-10">

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="relative">
              <label className="block text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                <Database className="w-4 h-4 text-text-muted" />
                Bier Menge (Liter)
              </label>
              <input 
                type="number"
                step="0.5"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent font-medium"
                placeholder="20"
              />
            </div>
            
            <div className="relative">
              <label className="block text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-text-muted" />
                Gärtemperatur (°C)
              </label>
              <input 
                type="number"
                step="0.5"
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent font-medium"
                placeholder="20"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                <Waves className="w-4 h-4 text-text-muted" />
                Ziel CO₂ (g/l)
              </label>
              <input 
                type="number"
                step="0.1"
                value={co2}
                onChange={(e) => setCo2(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent font-medium"
                placeholder="5.0"
              />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6">
            
            <div className="text-center md:text-left">
              <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wider mb-2">Zusätzlicher Zucker</h3>
              <div className="text-4xl md:text-6xl font-black text-text-primary mb-1 flex items-baseline justify-center md:justify-start">
                {displaySugar.toFixed(1)} <span className="text-2xl font-bold text-text-tertiary ml-2">g</span>
              </div>
              <p className="text-sm text-text-secondary mt-2">
                Gesamtmenge im Gärgefäß oder aufgeteilt pro Flasche.
              </p>
            </div>

            <div className="h-px w-full md:w-px md:h-24 bg-border/50"></div>

            <div className="text-center w-full md:w-auto mt-4 md:mt-0">
              <div className="bg-surface rounded-xl p-4 border border-border/50">
                <div className="text-sm font-medium text-text-tertiary mb-1">Rest-CO₂ nach der Gärung</div>
                <div className="text-xl font-bold text-text-secondary">{displayRemaining.toFixed(2)} g/l</div>
              </div>
            </div>

          </div>

        </div>

        {/* Education Section */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 flex flex-col md:flex-row gap-4">
          <div className="flex-shrink-0">
            <Info className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h4 className="font-bold text-text-primary mb-2">Warum die höchste Temperatur?</h4>
            <p className="text-sm text-text-secondary leading-relaxed">
              Die Löslichkeit von CO₂ stark temperaturabhängig ist. Gib hier die höchste Temperatur an, die das fertige Bier seit dem Ende der Hauptgärung erreicht hat, da Gase bei Erwärmung aus der Lösung entweichen. Typische CO₂ Zielwerte: Ales 4-5 g/l, Weizen 6-7 g/l, Stouts 3-4 g/l.
            </p>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}