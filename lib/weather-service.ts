/**
 * Phase 8: Open-Meteo Weather Service
 *
 * Fetches historical hourly weather data from the free Open-Meteo Historical API.
 * No API key required. GDPR-compliant (only lat/lng + timestamp sent, no PII).
 * Rate limit: 10,000 requests/day on the free tier.
 *
 * API docs: https://open-meteo.com/en/docs/historical-weather-api
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type WeatherCondition =
  | 'sunny'
  | 'partly_cloudy'
  | 'foggy'
  | 'rainy'
  | 'snowy'
  | 'stormy'
  | 'unavailable';

export type WeatherCategory = 'hot' | 'warm' | 'cool' | 'cold';

export interface WeatherData {
  tempC:      number;
  condition:  WeatherCondition;
  category:   WeatherCategory;
  isOutdoor:  boolean;   // heuristic: temp > 15°C AND no rain/snow
}

interface OpenMeteoHourlyResponse {
  hourly: {
    time:            string[];
    temperature_2m:  number[];
    weathercode:     number[];
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * WMO Weather Interpretation Codes → human-readable condition.
 * See https://open-meteo.com/en/docs#weathervariables
 */
export function weatherCodeToCondition(code: number): WeatherCondition {
  if (code === 0)                    return 'sunny';        // Clear sky
  if (code <= 3)                     return 'partly_cloudy';// Mainly clear / partly cloudy / overcast
  if (code >= 45 && code <= 48)      return 'foggy';        // Fog
  if (code >= 51 && code <= 67)      return 'rainy';        // Drizzle / rain
  if (code >= 71 && code <= 77)      return 'snowy';        // Snow
  if (code >= 80 && code <= 82)      return 'rainy';        // Rain showers
  if (code >= 85 && code <= 86)      return 'snowy';        // Snow showers
  if (code >= 95)                    return 'stormy';       // Thunderstorm
  return 'partly_cloudy';
}

export function tempToCategory(temp: number): WeatherCategory {
  if (temp > 25) return 'hot';
  if (temp > 15) return 'warm';
  if (temp >  5) return 'cool';
  return 'cold';
}

function isOutdoorFriendly(temp: number, condition: WeatherCondition): boolean {
  return temp > 15 && condition !== 'rainy' && condition !== 'snowy' && condition !== 'stormy';
}

/**
 * Round coordinate to 1 decimal place for API grouping (≈11km precision).
 */
export function roundCoord(value: number): number {
  return Math.round(value * 10) / 10;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main fetch function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch weather data for a specific location and datetime from Open-Meteo.
 *
 * @param lat       Latitude (rounded to 1 decimal)
 * @param lng       Longitude (rounded to 1 decimal)
 * @param scannedAt ISO timestamp of the scan
 * @returns WeatherData or null if API call fails
 */
export async function fetchWeatherForScan(
  lat: number,
  lng: number,
  scannedAt: string,
): Promise<WeatherData | null> {
  const date    = scannedAt.slice(0, 10);           // YYYY-MM-DD
  const hourStr = new Date(scannedAt).getUTCHours(); // 0–23 UTC

  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.searchParams.set('latitude',  roundCoord(lat).toFixed(1));
  url.searchParams.set('longitude', roundCoord(lng).toFixed(1));
  url.searchParams.set('start_date', date);
  url.searchParams.set('end_date',   date);
  url.searchParams.set('hourly',     'temperature_2m,weathercode');
  url.searchParams.set('timezone',   'UTC');

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000), // 8s timeout
    });

    if (!res.ok) {
      console.warn(`[WeatherService] Open-Meteo responded ${res.status} for ${lat}/${lng}`);
      return null;
    }

    const json = (await res.json()) as OpenMeteoHourlyResponse;
    const temps = json?.hourly?.temperature_2m;
    const codes = json?.hourly?.weathercode;

    if (!temps || !codes || temps.length < hourStr + 1) {
      console.warn('[WeatherService] Unexpected response shape', json);
      return null;
    }

    const tempC     = temps[hourStr] ?? temps[Math.min(hourStr, temps.length - 1)];
    const wmoCode   = codes[hourStr] ?? codes[Math.min(hourStr, codes.length - 1)];
    const condition = weatherCodeToCondition(wmoCode);
    const category  = tempToCategory(tempC);

    return {
      tempC,
      condition,
      category,
      isOutdoor: isOutdoorFriendly(tempC, condition),
    };
  } catch (err) {
    console.error('[WeatherService] fetch error', err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface ScanWeatherInput {
  id:        string;
  latitude:  number;
  longitude: number;
  scannedAt: string;  // ISO timestamp
}

export interface ScanWeatherResult extends ScanWeatherInput {
  weather: WeatherData | null;
}

/**
 * Fetch weather for a batch of scans, grouped by (roundedLat, roundedLng, date)
 * to minimise Open-Meteo API calls.
 */
export async function fetchWeatherBatch(
  scans: ScanWeatherInput[],
): Promise<ScanWeatherResult[]> {
  // Group scans by API key to de-duplicate calls
  type GroupKey = string;
  const groups = new Map<GroupKey, { lat: number; lng: number; scannedAt: string; ids: string[] }>();

  for (const scan of scans) {
    const rLat  = roundCoord(scan.latitude);
    const rLng  = roundCoord(scan.longitude);
    const date  = scan.scannedAt.slice(0, 10);
    const key   = `${rLat}_${rLng}_${date}`;

    const existing = groups.get(key);
    if (existing) {
      existing.ids.push(scan.id);
    } else {
      groups.set(key, { lat: rLat, lng: rLng, scannedAt: scan.scannedAt, ids: [scan.id] });
    }
  }

  // Fetch one API call per group (with 200ms delay between calls for rate-limiting)
  const weatherMap = new Map<string, WeatherData | null>();
  let callIndex = 0;

  for (const [key, group] of groups) {
    if (callIndex > 0) {
      await new Promise((r) => setTimeout(r, 200));
    }
    const result = await fetchWeatherForScan(group.lat, group.lng, group.scannedAt);

    // All scans in the same group get the same weather
    for (const id of group.ids) {
      weatherMap.set(id, result);
    }
    callIndex++;
  }

  return scans.map((scan) => ({
    ...scan,
    weather: weatherMap.get(scan.id) ?? null,
  }));
}
