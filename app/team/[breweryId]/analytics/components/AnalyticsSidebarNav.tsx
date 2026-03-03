'use client';

import { LayoutDashboard, Users, FlaskConical, MapPin, Mail, TrendingUp } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type AnalyticsSection = 'overview' | 'audience' | 'quality' | 'context' | 'market' | 'reports';

interface NavItem {
  section: AnalyticsSection;
  label: string;
  description: string;
  Icon: React.ElementType;
  separator?: boolean;
}

// ============================================================================
// Navigation Config
// ============================================================================

const NAV_ITEMS: NavItem[] = [
  {
    section: 'overview',
    label: 'Übersicht',
    description: 'Der 30-Sekunden-Blick',
    Icon: LayoutDashboard,
  },
  {
    section: 'audience',
    label: 'Zielgruppe',
    description: 'Wer trinkt mein Bier?',
    Icon: Users,
  },
  {
    section: 'quality',
    label: 'Geschmack',
    description: 'Die Bier-Sensorik',
    Icon: FlaskConical,
  },
  {
    section: 'context',
    label: 'Kontext',
    description: 'Wo & Wie?',
    Icon: MapPin,
  },
  {
    section: 'market',
    label: 'Marktintelligenz',
    description: 'Trends & Distribution',
    Icon: TrendingUp,
  },
  {
    section: 'reports',
    label: 'E-Mail Reports',
    description: 'Automatische Berichte',
    Icon: Mail,
    separator: true,
  },
];

// ============================================================================
// Component
// ============================================================================

interface AnalyticsSidebarNavProps {
  activeSection: AnalyticsSection;
  onNavigate: (section: AnalyticsSection) => void;
}

export default function AnalyticsSidebarNav({
  activeSection,
  onNavigate,
}: AnalyticsSidebarNavProps) {
  return (
    <nav className="w-full" aria-label="Analytics Navigation">
      <div className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ section, label, description, Icon, separator }) => {
          const isActive = activeSection === section;
          return (
            <div key={section}>
              {separator && <div className="my-2 border-t border-zinc-800" />}
              <button
                onClick={() => onNavigate(section)}
                className={`w-full text-left px-3 py-2.5 rounded-md flex items-center gap-3 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/20 group ${
                  isActive
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{label}</div>
                  <div
                    className={`text-[10px] truncate ${
                      isActive ? 'text-zinc-500' : 'text-zinc-700 group-hover:text-zinc-600'
                    }`}
                  >
                    {description}
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
