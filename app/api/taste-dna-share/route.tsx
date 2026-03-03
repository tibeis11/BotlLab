// ============================================================================
// Phase 12.1 — Taste DNA Share Image (OG / Instagram-Stories-Stil)
//
// Route: GET /api/taste-dna-share?userId=[uuid]
// Returns a 1080×1920 PNG card (optimised for Instagram Stories / TikTok).
//
// Uses Next.js built-in ImageResponse (no extra dependency needed).
// Only public-facing data is exposed (no private info).
// ============================================================================

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

// ─── Supabase service client (read-only, public data only) ───────────────────
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

// ─── Flavor dimension config (duplicated for edge runtime — no ts imports) ───
const DIMS = [
  { id: 'sweetness', label: 'Süße', color: '#f59e0b', icon: '🍯' },
  { id: 'bitterness', label: 'Bittere', color: '#84cc16', icon: '🌿' },
  { id: 'body', label: 'Körper', color: '#8b5cf6', icon: '💪' },
  { id: 'roast', label: 'Röst', color: '#ef4444', icon: '🔥' },
  { id: 'fruitiness', label: 'Frucht', color: '#ec4899', icon: '🍒' },
] as const;

// ─── Pentagon SVG path math ───────────────────────────────────────────────────
// Angles: start at -90° (top), step 72° clockwise
function pentagonPoints(
  values: Record<string, number>, // 0–1 per dim id
  cx: number,
  cy: number,
  maxR: number,
): string {
  return DIMS.map((dim, i) => {
    const angle = ((i * 72 - 90) * Math.PI) / 180;
    const r = (values[dim.id] ?? 0) * maxR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');
}

function gridPoints(cx: number, cy: number, r: number): string {
  return DIMS.map((_, i) => {
    const angle = ((i * 72 - 90) * Math.PI) / 180;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');
}

// ─── IQ Tier label ────────────────────────────────────────────────────────────
function iqLabel(iq: number): string {
  if (iq >= 500) return 'Master Taster';
  if (iq >= 200) return 'Experte';
  if (iq >= 100) return 'Enthusiast';
  if (iq >= 50) return 'Entdecker';
  return 'Einsteiger';
}

// ─── GET handler ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return new Response('Missing userId', { status: 400 });
  }

  // 1. Fetch public profile data
  const sb = getServiceClient();

  const [{ data: profile }, { data: events }] = await Promise.all([
    sb.from('profiles').select('display_name, tasting_iq').eq('id', userId).single(),
    sb
      .from('tasting_score_events')
      .select('metadata, match_score')
      .eq('user_id', userId)
      .eq('event_type', 'beat_the_brewer'),
  ]);

  if (!profile) {
    return new Response('User not found', { status: 404 });
  }

  const tastingIQ = profile.tasting_iq ?? 0;
  const gamesPlayed = events?.length ?? 0;

  // 2. Compute average flavor profile
  const sums: Record<string, number> = {
    sweetness: 0, bitterness: 0, body: 0, roast: 0, fruitiness: 0,
  };
  let totalMatch = 0;

  for (const ev of (events ?? [])) {
    const meta = ev.metadata as Record<string, unknown> | null;
    const sliders = meta?.slider_values as Record<string, number> | undefined;
    if (sliders) {
      for (const d of DIMS) {
        sums[d.id] += sliders[d.id] ?? 0;
      }
    }
    totalMatch += (ev.match_score ?? 0);
  }

  const avg: Record<string, number> = {};
  let strongestId = 'sweetness';
  let strongestVal = -1;

  for (const d of DIMS) {
    const v = gamesPlayed > 0 ? sums[d.id] / gamesPlayed : 0;
    avg[d.id] = v;
    if (v > strongestVal) {
      strongestVal = v;
      strongestId = d.id;
    }
  }

  const avgMatch = gamesPlayed > 0 ? Math.round(totalMatch * 100 / gamesPlayed) : 0;
  const strongestDim = DIMS.find((d) => d.id === strongestId)!;
  const displayName = profile.display_name ?? 'BotlLab Taster';
  const tier = iqLabel(tastingIQ);

  // 3. Layout constants
  const W = 1080;
  const H = 1920;
  const CX = W / 2;
  // Radar center (upper portion of card)
  const RADAR_CY = 760;
  const MAX_R = 220;

  const playerPoints = pentagonPoints(avg, CX, RADAR_CY, MAX_R);
  const grid100 = gridPoints(CX, RADAR_CY, MAX_R);
  const grid75 = gridPoints(CX, RADAR_CY, MAX_R * 0.75);
  const grid50 = gridPoints(CX, RADAR_CY, MAX_R * 0.5);
  const grid25 = gridPoints(CX, RADAR_CY, MAX_R * 0.25);

  // Axis lines
  const axisLines = DIMS.map((_, i) => {
    const angle = ((i * 72 - 90) * Math.PI) / 180;
    const x = CX + MAX_R * Math.cos(angle);
    const y = RADAR_CY + MAX_R * Math.sin(angle);
    return `M${CX},${RADAR_CY} L${x},${y}`;
  }).join(' ');

  // Dimension labels around radar
  const dimLabels = DIMS.map((dim, i) => {
    const angle = ((i * 72 - 90) * Math.PI) / 180;
    const r = MAX_R + 38;
    const x = CX + r * Math.cos(angle);
    const y = RADAR_CY + r * Math.sin(angle);
    return { x, y, icon: dim.icon, label: dim.label };
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          background: 'linear-gradient(160deg, #09090b 0%, #0f0f17 60%, #09090b 100%)',
          fontFamily: 'sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: 400,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 700,
            height: 700,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)',
          }}
        />

        {/* Top label */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 100,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: 14,
              color: '#06b6d4',
              textTransform: 'uppercase',
              marginBottom: 20,
            }}
          >
            BOTLLAB
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 5,
              color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase',
            }}
          >
            TASTE DNA
          </div>
        </div>

        {/* User name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: 'white',
            marginTop: 50,
            textAlign: 'center',
            maxWidth: 900,
            lineHeight: 1.1,
          }}
        >
          {displayName}
        </div>

        {/* Tier badge */}
        <div
          style={{
            display: 'flex',
            marginTop: 24,
            background: 'rgba(6,182,212,0.12)',
            border: '1px solid rgba(6,182,212,0.3)',
            borderRadius: 100,
            padding: '10px 32px',
          }}
        >
          <span style={{ fontSize: 26, color: '#06b6d4', fontWeight: 700 }}>{tier}</span>
        </div>

        {/* Radar SVG */}
        <svg
          width={W}
          height={600}
          style={{ marginTop: 30 }}
          viewBox={`0 0 ${W} ${RADAR_CY + MAX_R + 60}`}
        >
          {/* Grid rings */}
          {[grid100, grid75, grid50, grid25].map((pts, idx) => (
            <polygon
              key={idx}
              points={pts}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          ))}

          {/* Axis lines */}
          <path d={axisLines} stroke="rgba(255,255,255,0.06)" strokeWidth={1} fill="none" />

          {/* Player polygon */}
          <polygon
            points={playerPoints}
            fill="rgba(6,182,212,0.2)"
            stroke="#06b6d4"
            strokeWidth={2.5}
          />

          {/* Dim labels */}
          {dimLabels.map((dl) => (
            <g key={dl.label}>
              <text
                x={dl.x}
                y={dl.y - 6}
                textAnchor="middle"
                fontSize="26"
                fill="rgba(255,255,255,0.5)"
              >
                {dl.icon}
              </text>
              <text
                x={dl.x}
                y={dl.y + 24}
                textAnchor="middle"
                fontSize="20"
                fill="rgba(255,255,255,0.35)"
                fontWeight="700"
              >
                {dl.label.toUpperCase()}
              </text>
            </g>
          ))}
        </svg>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            gap: 24,
            marginTop: 40,
          }}
        >
          {[
            { label: 'TASTING IQ', value: String(tastingIQ), color: '#06b6d4' },
            { label: 'SPIELE', value: String(gamesPlayed), color: '#a78bfa' },
            { label: 'Ø MATCH', value: `${avgMatch}%`, color: '#34d399' },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 24,
                padding: '32px 44px',
                minWidth: 240,
              }}
            >
              <div style={{ fontSize: 72, fontWeight: 900, color: s.color, lineHeight: 1 }}>
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: 4,
                  color: 'rgba(255,255,255,0.3)',
                  marginTop: 12,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Strongest dimension */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 60,
            gap: 12,
          }}
        >
          <div style={{ fontSize: 26, color: 'rgba(255,255,255,0.3)', letterSpacing: 4, fontWeight: 700 }}>
            STÄRKSTE DIMENSION
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 56 }}>{strongestDim.icon}</span>
            <span
              style={{
                fontSize: 52,
                fontWeight: 900,
                color: strongestDim.color,
              }}
            >
              {strongestDim.label.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Bottom CTA */}
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div style={{ fontSize: 26, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, fontWeight: 700 }}>
            CHECK DEINE TASTE DNA
          </div>
          <div style={{ fontSize: 30, color: '#06b6d4', fontWeight: 900 }}>botllab.de</div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
    },
  );
}
