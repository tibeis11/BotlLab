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
      <div className="relative bg-gradient-to-br from-surface via-surface to-surface-hover/50 rounded-2xl p-8 border border-border overflow-hidden">
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
            <div className="w-16 h-16 rounded-2xl bg-border/80 border border-border-hover flex items-center justify-center shrink-0">
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-text-primary">{section}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-warning-bg text-warning border-warning/30 uppercase tracking-wide">
                  {phase}
                </span>
              </div>
              <p className="text-text-secondary text-sm max-w-xl">{description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-text-disabled text-xs">
            <Lock size={12} />
            <span>Dieses Modul befindet sich noch in der Entwicklung und wird in einer zukünftigen Version freigeschaltet.</span>
          </div>
        </div>
      </div>

      {/* Planned features grid */}
      <div>
        <p className="text-[10px] uppercase tracking-wider font-bold text-text-disabled mb-3">Geplante Features</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-surface/50 rounded-xl p-4 border border-border/80 flex gap-3 items-start"
            >
              <span className="text-2xl leading-none mt-0.5">{f.emoji}</span>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-text-primary">{f.title}</span>
                  {f.phase && (
                    <span className="text-[9px] text-text-disabled bg-surface-hover px-1.5 py-0.5 rounded border border-border-hover">
                      {f.phase}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
