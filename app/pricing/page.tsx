'use client';

import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { SUBSCRIPTION_TIERS } from '@/lib/premium-config'; // Optionale Nutzung für Preise

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary selection:bg-cyan-500/30">
      <Header />
      
      <main className="pt-8 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Development Banner */}
        <div className="max-w-3xl mx-auto mb-10">
          <div className="bg-warning-bg border border-warning/20 rounded-xl p-4 text-center">
            <p className="text-warning text-sm font-medium">
              <strong>Entwicklungsphase:</strong> BotlLab befindet sich aktuell in der aktiven Entwicklung.
              <span className="block sm:inline sm:ml-1">Premium-Modelle sind derzeit noch nicht buchbar.</span>
            </p>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6">
              Dein Brauprozess. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-success">Auf dem nächsten Level.</span>
            </h1>
            <p className="text-xl text-text-secondary leading-relaxed">
              Vom ersten Sud in der Garage bis zur professionellen Mikrobrauerei. 
              BotlLab wächst mit deinen Ambitionen.
            </p>
        </div>

        {/* Pricing Grid */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24">
            
            {/* FREE TIER */}
            <div className="bg-surface/30 border border-border rounded-3xl p-8 relative flex flex-col hover:border-border-hover transition duration-300">
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-text-primary mb-2">Free</h3>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-text-primary">€0</span>
                        <span className="text-text-muted">/Monat</span>
                    </div>
                    <p className="text-sm text-text-muted mt-4 h-10">
                        Der perfekte Start für deine ersten Sude und zum Entdecken der Plattform.
                    </p>
                </div>
                
                <ul className="space-y-4 mb-8 flex-1">
                    <FeatureItem active={true}>Community Rezepte</FeatureItem>
                    <FeatureItem active={true}>Basis Brau-Tools</FeatureItem>
                    <FeatureItem active={true} description="Erstelle & speichere eigene Rezepte">Rezepte Editor</FeatureItem>
                    <FeatureItem active={true} highlight="text-success">5 Teaser-Credits / Monat</FeatureItem>
                    <FeatureItem active={false}>Erweiterte Analytics</FeatureItem>
                    <FeatureItem active={false}>Eigenes Branding</FeatureItem>
                </ul>

                <Link 
                    href="/login" 
                    className="w-full py-3 rounded-xl border border-border-hover text-text-primary font-bold text-center hover:bg-surface-hover transition"
                >
                    Kostenlos starten
                </Link>
            </div>

            {/* BREWER TIER */}
            <div className="bg-gradient-to-b from-blue-900/10 to-surface/30 border border-blue-900/30 rounded-3xl p-8 relative flex flex-col hover:border-blue-500/30 transition duration-300 shadow-lg shadow-blue-900/10">
                 <div className="absolute top-0 right-0 p-4">
                    <span className="bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border border-blue-500/20">
                        Popular
                    </span>
                </div>
                
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-blue-400 mb-2">Brewer</h3>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-text-primary">€4.99</span>
                        <span className="text-text-muted">/Monat</span>
                    </div>
                    <p className="text-sm text-text-secondary mt-4 h-10">
                        Für ambitionierte Heimbrauer, die ihre Rezepte mit KI optimieren wollen.
                    </p>
                </div>
                
                <ul className="space-y-4 mb-8 flex-1">
                    <FeatureItem active={true}>Alles aus Free</FeatureItem>
                    <FeatureItem active={true} highlight="text-blue-400">50 AI Credits / Monat</FeatureItem>
                    <FeatureItem active={true} highlight="text-blue-400 font-bold">
                        Detailed Analytics
                        <span className="block text-blue-400/80 text-xs font-normal mt-0.5">Attribute-Verteilung & Timeline</span>
                    </FeatureItem>
                    <FeatureItem active={true}>Detaillierte Analytics</FeatureItem>
                    <FeatureItem active={true}>Custom Slogans</FeatureItem>
                    <FeatureItem active={false} warning="Slots weiterhin limitiert">Unlimitierte Rezepte</FeatureItem>
                    <FeatureItem active={false}>Eigenes Logo</FeatureItem>
                </ul>

                <button 
                    disabled
                    className="w-full py-3 rounded-xl bg-surface-hover text-text-muted font-bold text-center cursor-not-allowed border border-border-hover"
                >
                    Bald verfügbar
                </button>
            </div>

            {/* BREWERY TIER */}
            <div className="bg-gradient-to-b from-amber-900/10 to-surface/30 border border-amber-600/30 rounded-3xl p-8 relative flex flex-col scale-105 shadow-2xl shadow-amber-900/20 z-10">
                <div className="absolute top-0 inset-x-0 -mt-3 flex justify-center">
                    <span className="bg-amber-500 text-black text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                        Best Value
                    </span>
                </div>

                <div className="mb-6">
                    <h3 className="text-xl font-bold text-rating mb-2">Brewery</h3>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-text-primary">€14.99</span>
                        <span className="text-text-muted">/Monat</span>
                    </div>
                    <p className="text-sm text-text-secondary mt-4 h-10">
                        Die Komplettlösung ohne Grenzen. Für Vereine, Profis und echte Enthusiasten.
                    </p>
                </div>
                

                <ul className="space-y-4 mb-8 flex-1">
                    <FeatureItem active={true}>Alles aus Brewer</FeatureItem>
                    <FeatureItem active={true} highlight="text-success font-bold">
                        Unlimitierte Rezepte & Sude
                        <span className="block text-text-muted text-xs font-normal mt-0.5">Gilt nur für Brauereien in deinem Besitz</span>
                    </FeatureItem>
                    <FeatureItem active={true} highlight="text-rating font-bold">
                        Scan- & Performance-Analytics
                        <span className="block text-rating/80 text-xs font-normal mt-0.5">Geografische Verteilung, Top-Biere & Zeitverläufe</span>
                    </FeatureItem>
                    <FeatureItem active={true}>200 AI Credits / Monat</FeatureItem>
                    <FeatureItem active={true}>Eigenes Logo auf Labels</FeatureItem>
                    <FeatureItem active={true}>
                        Team-Management
                        <span className="block text-text-muted text-xs font-normal mt-0.5">Nur der Owner benötigt das Abo</span>
                    </FeatureItem>
                </ul>

                 <button 
                    disabled
                    className="w-full py-3 rounded-xl bg-surface-hover text-text-muted font-bold text-center cursor-not-allowed border border-border-hover"
                >
                    Bald verfügbar
                </button>
            </div>

            {/* ENTERPRISE TIER */}
            <div className="bg-surface/30 border border-purple-500/20 rounded-3xl p-8 relative flex flex-col hover:border-purple-500/50 transition duration-300">
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-accent-purple mb-2">Enterprise</h3>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-text-primary">Custom</span>
                    </div>
                    <p className="text-sm text-text-secondary mt-4 h-10">
                        Maßgeschneiderte Lösungen für Großbrauereien und spezielle Events.
                    </p>
                </div>
                

                <ul className="space-y-4 mb-8 flex-1">
                    <FeatureItem active={true}>Full Whitelabeling</FeatureItem>
                    <FeatureItem active={true}>API Zugang</FeatureItem>
                    <FeatureItem active={true} highlight="text-accent-purple font-bold">
                        Market Intelligence
                        <span className="block text-accent-purple/80 text-xs font-normal mt-0.5">Rohdaten-Export, Heatmaps & 365-Tage-Trends</span>
                    </FeatureItem>
                    <FeatureItem active={true}>Dedizierter Support</FeatureItem>
                    <FeatureItem active={true}>Custom AI Modelle</FeatureItem>
                </ul>

                <a 
                    href="mailto:partner@botllab.app" 
                    className="w-full py-3 rounded-xl border border-purple-500/30 text-accent-purple hover:bg-purple-500/10 font-bold text-center transition"
                >
                    Kontakt aufnehmen
                </a>
            </div>

        </div>

        {/* FAQ / Clarification Section */}
        <div className="max-w-4xl mx-auto space-y-12">
            
            <div className="text-center mb-12">
                <h2 className="text-3xl font-black text-text-primary mb-4">Häufige Fragen</h2>
                <p className="text-text-secondary">Alles was du über unsere Modelle wissen musst.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FaqItem 
                    question="Warum hat der 'Brewer' Plan Limits?"
                    answer="Der Brewer Plan ist für ambitionierte Heimbrauer gedacht, die KI-Unterstützung und bessere Analytics möchten, aber deren Produktionsmenge noch im Rahmen des Garage- oder Industrial-Levels liegt. Die Cloud-Kosten für unbegrenzte Datenbank-Einträge decken wir erst ab dem Brewery-Plan ab."
                />
                 <FaqItem 
                    question="Was sind AI Credits?"
                    answer="AI Credits werden für die Generierung von Rezepten, Etiketten-Bildern und KI-Feedback verwendet. Ein Credit entspricht ungefähr einer komplexen Anfrage oder Bild-Generierung. Free-Nutzer erhalten 5 Teaser-Credits pro Monat, um die KI-Funktionen unverbindlich zu testen."
                />
                 <FaqItem 
                    question="Kann ich jederzeit wechseln?"
                    answer="Ja, du kannst dein Abo monatlich upgraden oder downgraden. Beim Upgrade auf 'Brewery' werden deine Limits sofort aufgehoben."
                />
                 <FaqItem 
                    question="Braucht mein ganzes Team ein Abo?"
                    answer="Nein! Das 'Brewery' Abo ist an den Besitzer der Brauerei (Owner) gebunden. Solange der Owner ein aktives Abo hat, profitiert das gesamte Team von den Premium-Funktionen wie unlimitierten Rezepten und Shared Analytics."
                />
            </div>

        </div>

      </main>

      <Footer />
    </div>
  );
}

function FeatureItem({ children, active, highlight, warning, description }: { children: React.ReactNode, active: boolean, highlight?: string, warning?: string, description?: string }) {
    return (
        <li className="flex items-start gap-3 text-sm">
            <span className={`mt-0.5 text-lg leading-none ${active ? 'text-success' : 'text-text-disabled'}`}>
                {active ? '✓' : '•'}
            </span>
            <div className="flex-1">
                <span className={`${!active ? 'text-text-disabled line-through decoration-border' : highlight ? highlight : 'text-text-secondary'}`}>
                    {children}
                </span>
                {description && (
                    <p className="text-xs text-text-muted mt-0.5">{description}</p>
                )}
                {warning && (
                    <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wide mt-0.5">{warning}</p>
                )}
            </div>
        </li>
    )
}

function FaqItem({ question, answer }: { question: string, answer: string }) {
    return (
        <div className="bg-surface/20 border border-border rounded-2xl p-6">
            <h4 className="font-bold text-text-primary mb-2">{question}</h4>
            <p className="text-sm text-text-secondary leading-relaxed">{answer}</p>
        </div>
    )
}