'use client';

// ============================================================================
// Radar / Spider Chart for Flavor Profiles (Phase 11.1)
//
// Renders two overlapping profiles (player vs brewer) on a pentagon.
// - Smooth CSS transition on the reveal
// - Color-coded: cyan for player, amber for brewer
// - Grid rings at 25%, 50%, 75%, 100%
// ============================================================================

import React from 'react';
import { FLAVOR_DIMENSIONS, type FlavorProfile } from '@/lib/flavor-profile-config';

/** Flavor profile for radar chart rendering (source field excluded) */
export type RadarProfile = Omit<FlavorProfile, 'source'>;

interface RadarChartProps {
  playerProfile: RadarProfile;
  brewerProfile?: RadarProfile | null;
  /** Phase 3.6: Optional community average profile (dashed grey ring) */
  communityProfile?: Record<string, number> | null;
  showBrewer?: boolean;
  size?: number;
  className?: string;
}

const DIMS = FLAVOR_DIMENSIONS;
const NUM_AXES = DIMS.length;
const ANGLE_OFFSET = -Math.PI / 2; // Start from top

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleIndex: number,
): { x: number; y: number } {
  const angle = ANGLE_OFFSET + (2 * Math.PI * angleIndex) / NUM_AXES;
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

function profileToPoints(
  profile: RadarProfile,
  cx: number,
  cy: number,
  maxR: number,
): string {
  return DIMS.map((dim, i) => {
    const value = profile[dim.id];
    const r = value * maxR;
    const { x, y } = polarToCartesian(cx, cy, r, i);
    return `${x},${y}`;
  }).join(' ');
}

export default function RadarChart({
  playerProfile,
  brewerProfile,
  communityProfile,
  showBrewer = false,
  size = 280,
  className = '',
}: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.35; // Slightly reduced to leave room for labels
  const labelR = size * 0.47; // Label radius relative to chart center

  // Phase 4.1: CSS custom property tokens instead of hardcoded hex
  const playerColor = 'var(--color-brand)';
  const brewerColor = 'var(--color-rating)';
  const bgColor = 'var(--color-surface)';
  const fontSize = Math.max(9, Math.round(size * 0.052)); // scale with size

  // Extra padding so labels near the SVG edges aren't clipped
  const pad = Math.round(size * 0.12);
  const vbSize = size + pad * 2;

  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${vbSize} ${vbSize}`}
      width={size}
      height={size}
      role="img"
      aria-labelledby="radar-chart-title"
      className={className}
    >
      {/* Phase 7.4: SVG-Semantik für Screen-Reader */}
      <title id="radar-chart-title">Dein Geschmacksprofil vs. Brauer-Profil</title>
      {/* Background */}
      <circle cx={cx} cy={cy} r={maxR + 8} style={{ fill: bgColor }} fillOpacity={0.95} />

      {/* Grid rings */}
      {gridLevels.map((level) => {
        const points = Array.from({ length: NUM_AXES }, (_, i) => {
          const { x, y } = polarToCartesian(cx, cy, maxR * level, i);
          return `${x},${y}`;
        }).join(' ');
        return (
          <polygon
            key={level}
            points={points}
            fill="none"
            style={{ stroke: 'var(--color-border-hover)' }}
            strokeOpacity={0.6}
            strokeWidth={level === 1 ? 1.5 : 0.75}
          />
        );
      })}

      {/* Axis lines */}
      {DIMS.map((_, i) => {
        const { x, y } = polarToCartesian(cx, cy, maxR, i);
        return (
          <line
            key={`axis-${i}`}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            style={{ stroke: 'var(--color-border-hover)' }}
            strokeOpacity={0.4}
            strokeWidth={0.75}
          />
        );
      })}

      {/* Community profile (Phase 3.6: dashed grey ring, always visible if data exists) */}
      {communityProfile && (() => {
        const communityAsProfile = {
          sweetness: communityProfile.sweetness ?? 0.5,
          bitterness: communityProfile.bitterness ?? 0.5,
          body: communityProfile.body ?? 0.5,
          roast: communityProfile.roast ?? 0.5,
          fruitiness: communityProfile.fruitiness ?? 0.5,
        } as RadarProfile;
        return (
          <polygon
            points={profileToPoints(communityAsProfile, cx, cy, maxR)}
            fill="none"
            style={{ stroke: 'var(--color-text-muted)' }}
            strokeOpacity={0.7}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            strokeLinejoin="round"
          />
        );
      })()}

      {/* Brewer profile (revealed after submit) */}
      {brewerProfile && (
        <polygon
          points={profileToPoints(brewerProfile, cx, cy, maxR)}
          fillOpacity={0.15}
          strokeWidth={2}
          strokeLinejoin="round"
          style={{
            fill: brewerColor,
            stroke: brewerColor,
            opacity: showBrewer ? 1 : 0,
            transition: 'opacity 0.8s ease-in-out',
          }}
        />
      )}

      {/* Player profile */}
      <polygon
        points={profileToPoints(playerProfile, cx, cy, maxR)}
        fillOpacity={0.18}
        strokeWidth={2}
        strokeLinejoin="round"
        style={{ fill: playerColor, stroke: playerColor }}
      />

      {/* Player dots */}
      {DIMS.map((dim, i) => {
        const value = playerProfile[dim.id];
        const { x, y } = polarToCartesian(cx, cy, value * maxR, i);
        return (
          <circle
            key={`player-dot-${i}`}
            cx={x}
            cy={y}
            r={3.5}
            strokeWidth={1.5}
            style={{ fill: playerColor, stroke: bgColor }}
          />
        );
      })}

      {/* Brewer dots (revealed) */}
      {brewerProfile &&
        DIMS.map((dim, i) => {
          const value = brewerProfile[dim.id];
          const { x, y } = polarToCartesian(cx, cy, value * maxR, i);
          return (
            <circle
              key={`brewer-dot-${i}`}
              cx={x}
              cy={y}
              r={3.5}
              strokeWidth={1.5}
              style={{
                fill: brewerColor,
                stroke: bgColor,
                opacity: showBrewer ? 1 : 0,
                transition: 'opacity 0.8s ease-in-out 0.2s',
              }}
            />
          );
        })}

      {/* Axis labels — Phase 4.2: scaled fontSize + bg rect for legibility */}
      {DIMS.map((dim, i) => {
        const { x, y } = polarToCartesian(cx, cy, labelR, i);
        const bgPad = 3;
        const bgW = dim.labelShort.length * fontSize * 0.6 + bgPad * 2;
        const bgH = fontSize + bgPad * 2;
        return (
          <g key={`label-${i}`}>
            <rect
              x={x - bgW / 2}
              y={y - bgH / 2}
              width={bgW}
              height={bgH}
              rx={3}
              style={{ fill: bgColor }}
              fillOpacity={0.75}
            />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ fill: 'var(--color-text-muted)' }}
              fontSize={fontSize}
              fontWeight={500}
            >
              {dim.labelShort}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
