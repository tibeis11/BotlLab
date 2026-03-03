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
  showBrewer = false,
  size = 280,
  className = '',
}: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38; // Radius of outer ring
  const labelR = size * 0.47; // Radius for label placement

  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-labelledby="radar-chart-title"
      className={className}
    >
      {/* Phase 7.4: SVG-Semantik für Screen-Reader */}
      <title id="radar-chart-title">Dein Geschmacksprofil vs. Brauer-Profil</title>
      {/* Background */}
      <circle cx={cx} cy={cy} r={maxR + 8} fill="rgba(24,24,27,0.8)" />

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
            stroke="rgba(161,161,170,0.2)"
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
            stroke="rgba(161,161,170,0.15)"
            strokeWidth={0.75}
          />
        );
      })}

      {/* Brewer profile (revealed after submit) */}
      {brewerProfile && (
        <polygon
          points={profileToPoints(brewerProfile, cx, cy, maxR)}
          fill="rgba(245,158,11,0.15)"
          stroke="rgb(245,158,11)"
          strokeWidth={2}
          strokeLinejoin="round"
          style={{
            opacity: showBrewer ? 1 : 0,
            transition: 'opacity 0.8s ease-in-out',
          }}
        />
      )}

      {/* Player profile */}
      <polygon
        points={profileToPoints(playerProfile, cx, cy, maxR)}
        fill="rgba(6,182,212,0.18)"
        stroke="rgb(6,182,212)"
        strokeWidth={2}
        strokeLinejoin="round"
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
            fill="rgb(6,182,212)"
            stroke="rgb(24,24,27)"
            strokeWidth={1.5}
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
              fill="rgb(245,158,11)"
              stroke="rgb(24,24,27)"
              strokeWidth={1.5}
              style={{
                opacity: showBrewer ? 1 : 0,
                transition: 'opacity 0.8s ease-in-out 0.2s',
              }}
            />
          );
        })}

      {/* Axis labels */}
      {DIMS.map((dim, i) => {
        const { x, y } = polarToCartesian(cx, cy, labelR, i);
        return (
          <text
            key={`label-${i}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgb(161,161,170)"
            fontSize={11}
            fontWeight={500}
          >
            {dim.icon} {dim.label}
          </text>
        );
      })}
    </svg>
  );
}
