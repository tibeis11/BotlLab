import { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { Calculator, Waves, Droplet } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Brau-Rechner & Tools – BotlLab',
  description: 'Kostenlose Rechner für Hobbybrauer: Alkoholgehalt, Karbonisierung, Verdünnung und mehr.',
};

export default function ToolsLandingPage() {
  const tools = [
    {
      title: 'Alkohol-Rechner',
      description: 'Berechne den Alkoholgehalt (ABV) und scheinbaren Vergärungsgrad deines Bieres aus Stammwürze und Restextrakt.',
      href: '/tools/alkohol-rechner',
      icon: <Calculator className="w-8 h-8 text-brand" />,
      color: 'from-orange-500/20 to-amber-500/5'
    },
    {
      title: 'Karbonisierungs-Rechner',
      description: 'Ermittle die genaue Menge an Zucker oder Speise für die Flaschengärung deines Bieres.',
      href: '/tools/karbonisierung',
      icon: <Waves className="w-8 h-8 text-blue-500" />,
      color: 'from-blue-500/20 to-cyan-500/5'
    },
    {
      title: 'Verdünnungs-Rechner (Mischkreuz)',
      description: 'Zu hohe Stammwürze? Berechne wie viel Wasser du zugeben musst, um deine Zielstammwürze zu erreichen.',
      href: '/tools/verdunnung',
      icon: <Droplet className="w-8 h-8 text-teal-500" />,
      color: 'from-teal-500/20 to-emerald-500/5'
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 md:py-20">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-text-primary mb-6 tracking-tight">
            Kostenlose <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand to-blue-500">Brau-Tools</span>
          </h1>
          <p className="text-lg text-text-secondary">
            Egal ob Alkoholgehalt, Karbonisierung oder Verdünnung – unsere Rechner helfen dir dabei, dein Bier perfekt fein zu tunen. Schnell, gratis und immer griffbereit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <Link 
              key={tool.href}
              href={tool.href}
              className="group relative bg-surface border border-border rounded-2xl p-6 hover:border-brand/50 hover:shadow-xl hover:shadow-brand/5 transition-all duration-300 overflow-hidden flex flex-col"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-14 h-14 rounded-xl bg-surface-hover border border-border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  {tool.icon}
                </div>
                
                <h3 className="text-xl font-bold text-text-primary mb-3">
                  {tool.title}
                </h3>
                
                <p className="text-sm text-text-secondary leading-relaxed flex-1">
                  {tool.description}
                </p>

                <div className="mt-6 flex items-center font-semibold text-brand text-sm group-hover:translate-x-1 transition-transform">
                  Tool öffnen <span className="ml-2">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}