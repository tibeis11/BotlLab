'use client';

import { LayoutDashboard, Users, FlaskConical, MapPin, Mail, TrendingUp } from 'lucide-react';
import type { AnalyticsSection } from './AnalyticsSidebarNav';

const NAV_ITEMS: { section: AnalyticsSection; label: string; Icon: React.ElementType }[] = [
  { section: 'overview', label: 'Übersicht',  Icon: LayoutDashboard },
  { section: 'audience', label: 'Zielgruppe', Icon: Users },
  { section: 'quality',  label: 'Geschmack',  Icon: FlaskConical },
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
      <div className="flex gap-1 bg-black rounded-lg border border-zinc-800 p-1 overflow-x-auto">
        {NAV_ITEMS.map(({ section, label, Icon }) => {
          const isActive = activeSection === section;
          return (
            <button
              key={section}
              onClick={() => onNavigate(section)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
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
