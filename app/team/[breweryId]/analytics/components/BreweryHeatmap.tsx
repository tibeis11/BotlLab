'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// Dynamically import to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import('react-leaflet').then((mod) => mod.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

// Country coordinates (approximate center points)
const COUNTRY_COORDS: Record<string, [number, number]> = {
  'DE': [51.1657, 10.4515],  // Germany
  'AT': [47.5162, 14.5501],  // Austria
  'CH': [46.8182, 8.2275],   // Switzerland
  'US': [37.0902, -95.7129], // United States
  'GB': [55.3781, -3.4360],  // United Kingdom
  'FR': [46.2276, 2.2137],   // France
  'IT': [41.8719, 12.5674],  // Italy
  'ES': [40.4637, -3.7492],  // Spain
  'NL': [52.1326, 5.2913],   // Netherlands
  'BE': [50.5039, 4.4699],   // Belgium
  'PL': [51.9194, 19.1451],  // Poland
  'CZ': [49.8175, 15.4730],  // Czech Republic
  'SE': [60.1282, 18.6435],  // Sweden
  'NO': [60.4720, 8.4689],   // Norway
  'DK': [56.2639, 9.5018],   // Denmark
  'FI': [61.9241, 25.7482],  // Finland
};

interface HeatmapProps {
  data: Record<string, number>; // { 'DE': 45, 'AT': 12, ... }
}

export default function BreweryHeatmap({ data }: HeatmapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[500px] bg-zinc-800 rounded-lg flex items-center justify-center">
        <div className="text-zinc-500">Lade Karte...</div>
      </div>
    );
  }

  // Calculate max scans for color scaling
  const maxScans = Math.max(...Object.values(data));
  
  // Prepare markers
  const markers = Object.entries(data)
    .filter(([country]) => COUNTRY_COORDS[country]) // Only countries with coords
    .map(([country, scans]) => {
      const coords = COUNTRY_COORDS[country];
      const intensity = scans / maxScans; // 0-1
      const radius = 10 + intensity * 30; // 10-40px
      
      return {
        country,
        coords,
        scans,
        intensity,
        radius
      };
    });

  // Center map on Europe by default (or US if only US data)
  const hasUSData = markers.some(m => m.country === 'US');
  const hasEUData = markers.some(m => m.country !== 'US');
  const center: [number, number] = hasEUData ? [50, 10] : [37, -95];
  const zoom = hasEUData ? 4 : 4;

  return (
    <div className="relative">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '500px', width: '100%', borderRadius: '0.5rem' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {markers.map((marker) => (
          <CircleMarker
            key={marker.country}
            center={marker.coords}
            radius={marker.radius}
            pathOptions={{
              fillColor: `rgba(6, 182, 212, ${0.3 + marker.intensity * 0.7})`, // cyan-500 with varying opacity
              color: '#06b6d4',
              weight: 2,
              fillOpacity: 0.6 + marker.intensity * 0.4
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-bold">{getCountryName(marker.country)}</div>
                <div className="text-zinc-600">{marker.scans} Scans</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-zinc-900/90 backdrop-blur-sm rounded-lg p-3 text-sm z-[1000] border border-zinc-800">
        <div className="font-bold text-white mb-2">Scan-Intensität</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-500/40"></div>
          <span className="text-zinc-400 text-xs">Niedrig</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-4 h-4 rounded-full bg-cyan-500"></div>
          <span className="text-zinc-400 text-xs">Hoch</span>
        </div>
      </div>
    </div>
  );
}

function getCountryName(code: string): string {
  const names: Record<string, string> = {
    'DE': '🇩🇪 Deutschland',
    'AT': '🇦🇹 Österreich',
    'CH': '🇨🇭 Schweiz',
    'US': '🇺🇸 USA',
    'GB': '🇬🇧 Vereinigtes Königreich',
    'FR': '🇫🇷 Frankreich',
    'IT': '🇮🇹 Italien',
    'ES': '🇪🇸 Spanien',
    'NL': '🇳🇱 Niederlande',
    'BE': '🇧🇪 Belgien',
    'PL': '🇵🇱 Polen',
    'CZ': '🇨🇿 Tschechien',
    'SE': '🇸🇪 Schweden',
    'NO': '🇳🇴 Norwegen',
    'DK': '🇩🇰 Dänemark',
    'FI': '🇫🇮 Finnland',
  };
  return names[code] || code;
}
