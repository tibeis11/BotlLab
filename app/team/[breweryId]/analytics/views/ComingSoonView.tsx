// Shared "Coming Soon" layout for placeholder analytics views
import { Lock } from 'lucide-react';

interface PlannedFeature {
  emoji: string;
  title: string;
  description: string;
  phase?: string;
}

interface ComingSoonViewProps {
  section: string;
  description: string;
  icon: React.ReactNode;
  phase: string;
  features: PlannedFeature[];
}

export default function ComingSoonView({
  section,
  description,
  icon,
  phase,
  features,
}: ComingSoonViewProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero banner */}
      <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800/50 rounded-2xl p-8 border border-zinc-800 overflow-hidden">
        {/* Dot pattern background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative z-10">
          <div className="flex items-start gap-5 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center shrink-0">
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-white">{section}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium border bg-amber-950/30 text-amber-500 border-amber-900 uppercase tracking-wide">
                  {phase}
                </span>
              </div>
              <p className="text-zinc-400 text-sm max-w-xl">{description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-zinc-600 text-xs">
            <Lock size={12} />
            <span>Dieses Modul befindet sich noch in der Entwicklung und wird in einer zukünftigen Version freigeschaltet.</span>
          </div>
        </div>
      </div>

      {/* Planned features grid */}
      <div>
        <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 mb-3">Geplante Features</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/80 flex gap-3 items-start"
            >
              <span className="text-2xl leading-none mt-0.5">{f.emoji}</span>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-zinc-200">{f.title}</span>
                  {f.phase && (
                    <span className="text-[9px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                      {f.phase}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
