'use client';

import { LayoutDashboard, Users, FlaskConical, MapPin, Mail, TrendingUp, Sparkles } from 'lucide-react';
import type { AnalyticsSection } from './AnalyticsSidebarNav';

const NAV_ITEMS: { section: AnalyticsSection; label: string; Icon: React.ElementType }[] = [
  { section: 'overview', label: 'Übersicht',  Icon: LayoutDashboard },
  { section: 'audience', label: 'Zielgruppe', Icon: Users },
  { section: 'quality',  label: 'Geschmack',  Icon: FlaskConical },
  { section: 'vibes',    label: 'Vibes',      Icon: Sparkles },
  { section: 'context',  label: 'Kontext',    Icon: MapPin },
  { section: 'market',   label: 'Markt',      Icon: TrendingUp },
  { section: 'reports',  label: 'Reports',    Icon: Mail },
];

interface AnalyticsMobileNavProps {
  activeSection: AnalyticsSection;
  onNavigate: (section: AnalyticsSection) => void;
}

export default function AnalyticsMobileNav({ activeSection, onNavigate }: AnalyticsMobileNavProps) {
  return (
    <div className="lg:hidden mb-6">
      <div className="flex gap-1 bg-surface rounded-xl border border-border p-1 overflow-x-auto">
        {NAV_ITEMS.map(({ section, label, Icon }) => {
          const isActive = activeSection === section;
          return (
            <button
              key={section}
              onClick={() => onNavigate(section)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                isActive
                  ? 'bg-surface-hover text-text-primary'
                  : 'text-text-muted hover:text-text-secondary hover:bg-surface'
              }`}
            >
              <Icon size={12} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
