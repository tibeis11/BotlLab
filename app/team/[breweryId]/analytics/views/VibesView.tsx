import { Sparkles } from 'lucide-react';
import VibeTopVibesCard from '../components/VibeTopVibesCard';
import VibeTimeHeatmap from '../components/VibeTimeHeatmap';

interface VibesViewProps {
  breweryId: string;
}

export default function VibesView({ breweryId }: VibesViewProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Section header */}
      <div className="flex items-center gap-3 pb-2 border-b border-border">
        <Sparkles size={18} className="text-purple-400 shrink-0" />
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Trinkanlässe &amp; Vibes</h2>
          <p className="text-xs text-text-muted mt-0.5">
            In welchen Situationen wird dein Bier getrunken?
          </p>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Phase 9.2: Top Vibes + Social/Solo + Per-Brew */}
        <VibeTopVibesCard breweryId={breweryId} />

        {/* Phase 9.4: Tageszeit-Korrelation */}
        <VibeTimeHeatmap breweryId={breweryId} />
      </div>
    </div>
  );
}
