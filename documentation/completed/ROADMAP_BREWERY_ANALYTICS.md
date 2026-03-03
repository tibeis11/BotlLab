# Roadmap: Brewery Analytics System (Premium Feature)

**Status:** ✅ **Abgeschlossen** (Live)  
**Datum:** 20.01.2026  
**Ziel:** Implementierung eines umfassenden Analytics-Systems für Premium-Brauereien zur Messung von QR-Code-Scans, regionaler Verteilung und Bier-Popularität.

---

## 1. Vision & Abgrenzung

### 1.1 Zwei Analytics-Systeme

BotlLab benötigt **zwei getrennte Analytics-Systeme** mit unterschiedlichen Zwecken und Zielgruppen:

#### **System A: Brewery Analytics (Premium Feature)**

- **Zweck:** Business Intelligence für Brauereien
- **Zielgruppe:** Brewery-Owner mit Brewer+, Brewery oder Enterprise Tier
- **Zugriff:** `/team/[breweryId]/analytics` (nur für Premium-Breweries)
- **Datenquelle:** `bottle_scans` Tabelle
- **Fokus:**
  - QR-Code-Scan-Häufigkeit pro Bier/Flasche
  - Geografische Verteilung der Scans (IP-basiert, anonymisiert)
  - Trending-Biere (Popularität über Zeit)
  - Zeitverläufe (Peak-Zeiten, Wochentage)
  - Engagement-Metriken (Ratings, Remix-Rate)

#### **System B: Admin Analytics (Interne Systemdaten)**

- **Zweck:** Produkt- und Monetarisierungs-Optimierung
- **Zielgruppe:** BotlLab-Administratoren
- **Zugriff:** `/admin/dashboard` (nur für ADMIN_EMAILS)
- **Datenquelle:** `analytics_events` Tabelle
- **Fokus:**
  - Limit-Events (Monetarisierungs-Trigger)
  - Feature-Adoption (welche Features werden genutzt?)
  - System-Fehler und Performance
  - User-Retention und Churn

**Wichtig:** Diese Roadmap beschreibt ausschließlich **System A (Brewery Analytics)**.

---

## 2. Rechtliche & Privacy-Grundlagen

### 2.1 DSGVO-Konformität

#### **IP-Adress-Anonymisierung**

- **Problem:** Volle IP-Adressen sind personenbezogene Daten (EuGH-Urteil C-582/14)
- **Lösung:** Speicherung nur der ersten 3 Oktette (z.B. `192.168.1.0` statt `192.168.1.123`)
- **Zweck:** Ermöglicht grobe geografische Zuordnung (Stadt/Region), aber keine Identifikation einzelner Personen
- **Rechtsgrundlage:** Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO) für Produktverbesserung

#### **User-Opt-Out-Respekt**

- **Für eingeloggte User:** Prüfung des `analytics_opt_out` Flags in `profiles` Tabelle
- **Für anonyme Scans:** Tracking immer erlaubt (keine personenbezogenen Daten)
- **Implementierung:** `trackBottleScan()` Funktion prüft Opt-Out vor dem Insert

#### **Datenlöschung & Retention**

- **Scan-Daten:** Automatische Löschung nach 12 Monaten (via Cronjob oder Supabase Edge Function)
- **User-Recht auf Löschung:** Bei Account-Deletion werden alle Scans anonymisiert (`viewer_user_id` → NULL)
- **Aggregierte Daten:** Dürfen unbegrenzt gespeichert werden (keine personenbezogenen Daten mehr)

### 2.2 Privacy Policy Update

Folgende Ergänzung in der Datenschutzerklärung:

> **QR-Code-Scan-Tracking**  
> Wenn Sie einen QR-Code auf einer BotlLab-Flasche scannen, erfassen wir folgende Daten zur Bereitstellung von Analytics für die zugehörige Brauerei:
>
> - Zeitstempel des Scans
> - Grobe geografische Region (basierend auf den ersten 3 Oktetten Ihrer IP-Adresse, z.B. "Berlin")
> - Gerätetyp (Desktop/Mobile, via User-Agent)
> - Falls Sie eingeloggt sind: Ihre User-ID (um doppelte Scans zu erkennen)
>
> **Zweck:** Brauereien mit Premium-Abonnement können diese Daten nutzen, um zu verstehen, wo und wann ihre Biere getrunken werden.  
> **Rechtsgrundlage:** Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO).  
> **Speicherdauer:** 12 Monate, danach automatische Löschung.  
> **Widerspruchsrecht:** Sie können das Tracking in Ihren [Account-Einstellungen](#) deaktivieren (nur für eingeloggte User).

---

## 3. Datenbank-Schema

### 3.1 Tabelle: `bottle_scans` (Log-Tabelle)

Erfasst die Rohdaten der Scans (ohne IP).

```sql
CREATE TABLE IF NOT EXISTS bottle_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Was wurde gescannt?
  bottle_id UUID NOT NULL REFERENCES bottles(id) ON DELETE CASCADE,
  brew_id UUID REFERENCES brews(id) ON DELETE SET NULL,
  brewery_id UUID REFERENCES breweries(id) ON DELETE SET NULL,

  -- Wer? (Session-Hash für Unique-Check oder User-ID)
  viewer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_hash TEXT, -- SHA256(IP+UA+Date+Salt), rotiert alle 24h

  -- Wo? (Nur aufgelöste Geo-Daten, keine IP!)
  country_code TEXT, -- "DE", "AT"...
  city TEXT, -- "Berlin", "München"...

  -- Womit?
  user_agent_parsed TEXT, -- "Chrome on Android" (kein raw UA String nötig)
  device_type TEXT, -- "mobile" | "desktop" | "tablet"

  -- Kontext
  scan_source TEXT DEFAULT 'qr_code',
  is_owner_scan BOOLEAN DEFAULT FALSE
);

-- Indizes für Aggregation
CREATE INDEX idx_bottle_scans_aggregation
ON bottle_scans(brewery_id, created_at);
```

### 3.2 Tabelle: `analytics_daily_stats` (Performance-Layer)

Um das Dashboard superschnell zu machen, aggregieren wir Daten vor. Das verhindert langsame `COUNT(*)` Queries.

```sql
CREATE TABLE IF NOT EXISTS analytics_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  brewery_id UUID NOT NULL REFERENCES breweries(id) ON DELETE CASCADE,

  -- Dimensionen
  brew_id UUID REFERENCES brews(id) ON DELETE SET NULL,
  country_code TEXT,
  device_type TEXT,

  -- Metriken
  total_scans INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,

  UNIQUE(date, brewery_id, brew_id, country_code, device_type)
);

-- Index für Dashboard-Reads
CREATE INDEX idx_analytics_read
ON analytics_daily_stats(brewery_id, date);
```

### 3.3 Trigger Logic (Konzept)

Ein Database-Trigger (oder die API-Action) aktualisiert `analytics_daily_stats` bei jedem Insert in `bottle_scans`.

---

## 4. Backend-Implementierung

### 4.1 Tracking-Funktionen (`lib/actions/analytics-actions.ts`)

Wir erweitern die bestehende Datei um zwei neue Funktionen:

#### **4.1.1 `trackLimitHit()` - Limit-Event-Wrapper**

Vereinfacht das Tracking von Monetarisierungs-Events (Limit erreicht).

```typescript
/**
 * Track when user hits a limit (monetization trigger)
 * @param limitType - Type of limit: 'brews' | 'bottles' | 'members' | 'remix'
 * @param payload - Context data (current count, limit, tier, etc.)
 */
export async function trackLimitHit(
  limitType: "brews" | "bottles" | "members" | "remix",
  payload: {
    current: number;
    limit: number;
    tier: string;
    brewery_id?: string;
    [key: string]: any;
  }
) {
  return trackEvent({
    event_type: `limit_reached_${limitType}`,
    category: "monetization",
    payload: {
      ...payload,
      timestamp: new Date().toISOString(),
    },
  });
}
```

**Verwendung:**

```typescript
// Beispiel: Brew-Limit erreicht
await trackLimitHit("brews", {
  current: 5,
  limit: 5,
  tier: "Garage Brewery",
  brewery_id: breweryId,
  attempted_action: "create_brew",
});
```

#### **4.1.2 `trackBottleScan()` - Secure Scan Tracking**

Optimiert für Privacy (keine IP-Speicherung) und Bot-Schutz.

```typescript
"use server";

import { createClient } from "@/lib/supabase-server";
import { headers } from "next/headers";
import crypto from "crypto";

export async function trackBottleScan(
  bottleId: string,
  payload?: {
    brewId?: string;
    breweryId?: string;
    viewerUserId?: string;
    bottleSize?: number;
    scanSource?: "qr_code" | "direct_link";
  }
) {
  try {
    const supabase = await createClient();
    const headersList = await headers();

    // Ant-Bot Check: Validate Request
    const userAgent = headersList.get("user-agent") || "unknown";
    if (isBot(userAgent)) {
      console.log("Bot detected, skipping scan tracking");
      return;
    }

    // 1. Check Opt-Out (Logged in user)
    // ... code ...

    // 2. Privacy-Friendly Geo Lookup (In-Memory!)
    const rawIp =
      headersList.get("x-forwarded-for")?.split(",")[0] || "unknown";
    // MOCK-IMPLEMENTIERUNG FÜR PHASE 1:
    // Später via Service (z.B. Vercel Headers oder ipapi)
    const geoData = {
      country: headersList.get("x-vercel-ip-country") || "unknown",
      city: headersList.get("x-vercel-ip-city") || "unknown",
    };

    // WICHTIG: Wir verwerfen 'rawIp' sofort und nutzen nur geoData!

    // 3. Daily Rotating Hash for Unique Visitors
    // Salt aus ENV oder generiert (rotiert täglich)
    const dailySalt =
      new Date().toISOString().slice(0, 10) + process.env.ANALYTICS_SALT;
    const sessionHash = crypto
      .createHash("sha256")
      .update(rawIp + userAgent + dailySalt)
      .digest("hex");

    // 4. Insert (ohne IP)
    await supabase.from("bottle_scans").insert({
      bottle_id: bottleId,
      brewery_id: payload?.breweryId,
      session_hash: sessionHash, // Anonym
      country_code: geoData.country,
      city: geoData.city,
      device_type: detectDeviceType(userAgent),
      // ...
    });
  } catch (e) {
    console.error("Tracking Error", e);
  }
}

function isBot(ua: string) {
  return /bot|crawler|spider|crawling/i.test(ua);
}
```

**Optimierungen:**

1.  **Anti-Bot:** Wir filtern offensichtliche Crawler aus.
2.  **Privacy:** Die IP wird nur zur Hash-Bildung und Geo-Auflösung genutzt, aber nie gespeichert.
3.  **Performance:** Aggregation kann via Trigger oder asynchron passieren.

### 4.2 Caching & Aggregation

Für die geografische Zuordnung der `ip_region` zu Stadt/Land können wir später ein IP-Geolocation-Service integrieren:

**Optionen:**

1. **MaxMind GeoLite2** (kostenlos, selbst gehostet)
2. **ipapi.co** (kostenlose API, 1000 Requests/Tag)
3. **Cloudflare Workers** (haben bereits IP-Geolocation-Daten im Header)

**Implementierung (Beispiel mit ipapi.co):**

```typescript
// Optional: Enrich ip_region with city/country
async function enrichIpData(
  ipRegion: string
): Promise<{ country: string; city: string } | null> {
  if (ipRegion === "unknown") return null;

  try {
    // Use first 3 octets + ".1" for lookup (approximate)
    const lookupIp = ipRegion.replace(".0", ".1");
    const res = await fetch(`https://ipapi.co/${lookupIp}/json/`);
    const data = await res.json();

    return {
      country: data.country_code || "unknown",
      city: data.city || "unknown",
    };
  } catch (e) {
    console.error("IP enrichment failed:", e);
    return null;
  }
}
```

**Wichtig:** Nur in Phase 2, da es zusätzliche API-Abhängigkeit schafft.

---

## 5. Frontend-Implementierung

### 5.1 Tracking-Integration in Scan-Page

**Datei:** `app/b/[id]/page.tsx`

Wir fügen das Tracking beim Laden der Seite (= QR-Code-Scan) hinzu.

```tsx
"use client";

import { useEffect } from "react";
import { trackBottleScan } from "@/lib/actions/analytics-actions";
import { useAuth } from "@/app/context/AuthContext";

export default function BottleDetailPage() {
  const params = useParams();
  const bottleId = params.id as string;
  const { user } = useAuth();

  const [bottle, setBottle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBottle() {
      // Fetch bottle data...
      const { data } = await supabase
        .from("bottles")
        .select("*, brews(*)")
        .eq("id", bottleId)
        .single();

      setBottle(data);
      setLoading(false);

      // Track Scan (nach erfolgreichem Load)
      if (data) {
        await trackBottleScan(bottleId, {
          brewId: data.brew_id,
          breweryId: data.brews?.brewery_id,
          viewerUserId: user?.id,
          bottleSize: data.size_l,
          scanSource: "qr_code", // oder 'direct_link' wenn URL-Parameter gesetzt
        });
      }
    }

    loadBottle();
  }, [bottleId, user]);

  // ... Rest der Komponente
}
```

**Wichtig:**

- Tracking erfolgt **nach** erfolgreichem Laden der Flasche (nicht bei 404)
- `scanSource` kann via URL-Parameter differenziert werden (z.B. `?source=share`)

### 5.2 Analytics Dashboard für Brauereien

**Datei:** `app/team/[breweryId]/analytics/page.tsx` (komplett neu erstellen)

Diese Seite zeigt Brewery-Insights nur für Premium-Brauereien und ist über die Team-Navigation erreichbar.

#### **5.2.1 Premium-Check & Brewery-Auswahl**

```tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import { getPremiumStatus } from "@/lib/actions/premium-actions";
import { getUserBreweries } from "@/lib/supabase";
import Link from "next/link";
import { Lock, TrendingUp, MapPin, Clock, Users } from "lucide-react";

export default function BreweryAnalyticsPage({
  params,
}: {
  params: { breweryId: string };
}) {
  const { user } = useAuth();
  const { breweryId } = params;
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [brewery, setBrewery] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    async function checkAccess() {
      if (!user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // Get brewery data and check if user is owner
      const { data: breweryData } = await supabase
        .from("breweries")
        .select("*, members:brewery_members(*)")
        .eq("id", breweryId)
        .single();

      if (!breweryData) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      setBrewery(breweryData);

      // Check if user is owner
      const isOwner = breweryData.members?.some(
        (m: any) => m.user_id === user.id && m.role === "owner"
      );

      if (!isOwner) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // Check if brewery has premium tier
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("tier")
        .eq("id", breweryData.owner_id)
        .single();

      const hasPremiumTier = ownerProfile?.tier && ownerProfile.tier !== "free";
      setHasAccess(hasPremiumTier);

      setLoading(false);
    }

    checkAccess();
  }, [user, breweryId]);

  useEffect(() => {
    if (hasAccess) {
      fetchAnalytics();
    }
  }, [hasAccess, timeRange]);

  // ... Analytics-Fetching-Logik (siehe Abschnitt 5.2.2)
}
```

#### **5.2.2 Daten-Fetching-Logik**

```tsx
async function fetchAnalytics() {
  if (!breweryId) return;

  try {
    // Calculate date range
    const daysAgo = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // 1. Aggregated Stats (Performance Optimized)
    const { data: stats } = await supabase
      .from("analytics_daily_stats")
      .select("scan_count, unique_visitors, country_code, device_type, date")
      .eq("brewery_id", breweryId)
      .gte("date", startDate.toISOString());

    if (!stats) return;

    // Client-Side Aggregation
    const totalScans = stats.reduce(
      (sum, row) => sum + (row.scan_count || 0),
      0
    );
    const uniqueViewers = stats.reduce(
      (sum, row) => sum + (row.unique_visitors || 0),
      0
    );

    // Top Regions
    const regionMap: Record<string, number> = {};
    stats.forEach((row) => {
      const region = row.country_code || "unknown";
      if (region !== "unknown") {
        regionMap[region] = (regionMap[region] || 0) + (row.scan_count || 0);
      }
    });

    const topRegions = Object.entries(regionMap)
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Daily Scans
    const dailyMap: Record<string, number> = {};
    stats.forEach((row) => {
      const date = row.date;
      dailyMap[date] = (dailyMap[date] || 0) + (row.scan_count || 0);
    });
    const dailyScans = Object.entries(dailyMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Device Types
    const deviceMap: Record<string, number> = {};
    stats.forEach((row) => {
      const device = row.device_type || "unknown";
      deviceMap[device] = (deviceMap[device] || 0) + (row.scan_count || 0);
    });

    setAnalytics({
      totalScans,
      uniqueViewers,
      topBrews: [], // TODO: Load brew stats separately
      topRegions,
      dailyScans,
      deviceCounts,
    });
  } catch (error) {
    console.error("Analytics fetch error:", error);
  }
}
```

#### **5.2.3 UI-Komponenten**

```tsx
// Premium-Lock-Screen (wenn kein Zugriff)
if (!hasAccess) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-12 max-w-2xl">
        <div className="w-16 h-16 mx-auto mb-6 bg-zinc-800 rounded-full flex items-center justify-center">
          <Lock className="w-8 h-8 text-zinc-500" />
        </div>
        <h1 className="text-3xl font-bold mb-4">
          Brewery Analytics freischalten
        </h1>
        <p className="text-zinc-400 text-lg mb-8">
          Detaillierte Scan-Statistiken, geografische Verteilung und
          Bier-Popularität sind exklusiv für Premium-Brauereien verfügbar.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard/account"
            className="px-6 py-3 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 transition"
          >
            Jetzt upgraden
          </Link>
        </div>
      </div>
    </div>
  );
}

// Analytics-Dashboard (wenn Zugriff vorhanden)
return (
  <div className="space-y-6">
    {/* Header mit Brewery-Info */}
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 className="text-3xl font-bold mb-2">Analytics</h1>
        <p className="text-zinc-400">
          {brewery?.name} - QR-Code-Scans und Bier-Popularität
        </p>
      </div>

      <div className="flex gap-3">
        {/* Time Range Selector */}
        <div className="flex gap-2">
          {(["7d", "30d", "90d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                timeRange === range
                  ? "bg-cyan-500 text-black"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {range === "7d"
                ? "7 Tage"
                : range === "30d"
                  ? "30 Tage"
                  : "90 Tage"}
            </button>
          ))}
        </div>
      </div>
    </div>

    {/* Stats Grid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard
        icon={<TrendingUp className="w-5 h-5 text-cyan-500" />}
        title="Gesamte Scans"
        value={analytics?.totalScans || 0}
        iconBg="bg-cyan-500/10"
      />
      <StatCard
        icon={<Users className="w-5 h-5 text-purple-500" />}
        title="Unique Viewers"
        value={analytics?.uniqueViewers || 0}
        iconBg="bg-purple-500/10"
      />
      <StatCard
        icon={<MapPin className="w-5 h-5 text-amber-500" />}
        title="Regionen"
        value={analytics?.topRegions?.length || 0}
        iconBg="bg-amber-500/10"
      />
    </div>

    {/* Chart: Scans über Zeit */}
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <Clock className="w-5 h-5 text-cyan-500" />
        Scan-Verlauf
      </h2>
      {analytics?.dailyScans && analytics.dailyScans.length > 0 ? (
        <ScanChart data={analytics.dailyScans} />
      ) : (
        <p className="text-zinc-500 text-center py-12">Keine Daten verfügbar</p>
      )}
    </div>

    {/* Two-Column Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Top Brews */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">Beliebteste Biere</h2>
        <div className="space-y-3">
          {analytics?.topBrews?.map((brew: any, idx: number) => (
            <div
              key={brew.brew_id}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-zinc-700">
                  #{idx + 1}
                </span>
                <span className="text-sm text-zinc-300">{brew.brew_name}</span>
              </div>
              <span className="text-sm font-bold text-cyan-400">
                {brew.count} Scans
              </span>
            </div>
          ))}
          {(!analytics?.topBrews || analytics.topBrews.length === 0) && (
            <p className="text-zinc-500 text-sm text-center py-8">
              Noch keine Scans
            </p>
          )}
        </div>
      </div>

      {/* Top Regions */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">Top-Regionen</h2>
        <div className="space-y-3">
          {analytics?.topRegions?.map((region: any, idx: number) => (
            <div
              key={region.region}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-zinc-500" />
                <span className="text-sm text-zinc-300 font-mono">
                  {region.region}
                </span>
              </div>
              <span className="text-sm font-bold text-purple-400">
                {region.count}x
              </span>
            </div>
          ))}
          {(!analytics?.topRegions || analytics.topRegions.length === 0) && (
            <p className="text-zinc-500 text-sm text-center py-8">
              Keine Regionsdaten
            </p>
          )}
        </div>
      </div>
    </div>

    {/* Device Types */}
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">Geräte-Typen</h2>
      <div className="flex gap-6">
        {Object.entries(analytics?.deviceCounts || {}).map(
          ([device, count]) => (
            <div key={device} className="flex-1 text-center">
              <div className="text-3xl font-black mb-2">{count as number}</div>
              <div className="text-sm text-zinc-400 capitalize">{device}</div>
            </div>
          )
        )}
      </div>
    </div>

    {/* Privacy Notice */}
    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6">
      <p className="text-sm text-zinc-400">
        <strong className="text-white">Datenschutz-Hinweis:</strong> Alle
        Scan-Daten werden anonymisiert gespeichert. IP-Adressen werden auf die
        ersten 3 Oktette reduziert (z.B. "192.168.1.0"), wodurch keine
        Identifikation einzelner Personen möglich ist. Daten werden nach 12
        Monaten automatisch gelöscht.
      </p>
    </div>
  </div>
);
```

#### **5.2.4 Helper-Komponenten**

````tsx
// Stat Card Component
function StatCard({ icon, title, value, iconBg }: any) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}
        >
          {icon}
        </div>
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wide">
          {title}
        </h3>
      </div>
      <p className="text-4xl font-black">{value}</p>
    </div>
  );
}

// Scan Chart Component (Simple Bar Chart)
function ScanChart({ data }: { data: { date: string; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-2 h-64">
      {data.map(({ date, count }) => (
        <div key={date} className="flex-1 flex flex-col items-center gap-2">
          <div
            className="w-full bg-cyan-500 rounded-t-lg transition-all hover:bg-cyan-400 cursor-pointer"
            style={{ height: `${(count / maxCount) * 100}%`, minHeight: "4px" }}
            title={`${date}: ${count} scans`}
          />
          <span className="text-xs text-zinc-500 rotate-45 origin-top-left whitespace-nowrap">
            {new Date(date).toLocaleDateString("de-DE", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      ))}
    </div>
  );
}

### 5.3 Bot Protection Strategy

Da wir serverseitiges Tracking vermeiden (um Bots nicht als Scans zu zählen), nutzen wir einen "Client-Side Check".

1.  **Challenge:** Page Load zählt noch nicht als Scan.
2.  **Trigger:** Der `useEffect` Hook im Client sendet einen POST-Request an `/api/track-scan`.
3.  **Honeypot:** Das Payload enthält ein verstecktes Feld `website_url`, das leer sein muss. Bots füllen das oft aus.
4.  **Rate Limiting:** IP-basiertes Limit (z.B. 10 Scans/Minute) via Supabase Edge Functions.

---

## 6. Admin-Analytics (Abgrenzung)

Für den Admin-Bereich (`/admin/dashboard`) nutzen wir weiterhin die `analytics_events` Tabelle.

**Wichtig:** Admin-Analytics und Brewery-Analytics sind **getrennte Systeme**:

| Feature          | Admin Analytics                 | Brewery Analytics             |
| ---------------- | ------------------------------- | ----------------------------- |
| **Datentabelle** | `analytics_events`              | `bottle_scans`                |
| **Zugriff**      | Nur ADMIN_EMAILS                | Premium Brewery-Owner         |
| **Zweck**        | Produkt-Optimierung             | Business Intelligence         |
| **Events**       | Limits, Fehler, Feature-Nutzung | QR-Scans, Popularität         |
| **UI-Location**  | `/admin/dashboard`              | `/team/[breweryId]/analytics` |

---

## 7. Navigation-Integration

### 7.1 Integration in SquadHeader

Die Analytics-Seite wird als neuer Tab in der Team-Navigation (`app/team/components/SquadHeader.tsx`) integriert.

**Zu ergänzen:**

```tsx
// In SquadHeader.tsx - Tab-Liste erweitern
const tabs = [
  { href: `/team/${breweryId}`, label: "Übersicht", icon: Home },
  { href: `/team/${breweryId}/members`, label: "Mitglieder", icon: Users },
  {
    href: `/team/${breweryId}/settings`,
    label: "Einstellungen",
    icon: Settings,
  },
  // NEU: Analytics-Tab (nur für Premium)
  ...(isPremium
    ? [
        {
          href: `/team/${breweryId}/analytics`,
          label: "Analytics",
          icon: TrendingUp,
          badge: "PRO", // Optional: Premium-Badge
        },
      ]
    : []),
];
````

**Premium-Check:**

```tsx
// Im SquadHeader: Premium-Status des Brewery-Owners prüfen
const [isPremium, setIsPremium] = useState(false);

useEffect(() => {
  async function checkPremium() {
    const { data: brewery } = await supabase
      .from("breweries")
      .select("owner_id")
      .eq("id", breweryId)
      .single();

    if (brewery?.owner_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tier")
        .eq("id", brewery.owner_id)
        .single();

      setIsPremium(profile?.tier !== "free");
    }
  }

  checkPremium();
}, [breweryId]);
```

---

## 8. Implementierungs-Phasen

### **Phase 1: Foundation (Tag 1-2)** ✅

1. ✅ Datenbank-Migration erstellen (`bottle_scans` Tabelle)
2. ✅ `trackBottleScan()` Funktion implementieren
3. ✅ `trackLimitHit()` Utility-Funktion
4. ✅ Tracking in `app/b/[id]/page.tsx` einbauen
5. ✅ Testen mit lokalen Supabase-Daten

### **Phase 2: Analytics-Dashboard (Tag 3-4)** ✅

6. ✅ Analytics-Page komplett neu schreiben
7. ✅ Premium-Check integrieren
8. ✅ Daten-Fetching-Logik implementieren
9. ✅ UI-Komponenten (Stats, Charts, Listen)
10. ✅ Brewery-Auswahl (Multi-Brewery-Support)

### **Phase 3: Time-to-Glass & Performance (Tag 5-7)** ✅

11. ✅ `scan_count` Spalte + Trigger für Bottles
12. ✅ **Time-to-Glass:** Analyse der Scan-Uhrzeiten (Wann wird welches Bier getrunken?)
13. ✅ **Conversion Rate Vorbereitung:** `converted_to_rating` Spalte + Tracking-Logik
14. ✅ Indexierung für Performance-Optimierung
15. ✅ `increment_daily_stats` RPC mit SECURITY DEFINER

### **Phase 4: Heatmap mit Geo-Koordinaten** ✅ (Abgeschlossen: 20.01.2026)

16. ✅ Geo-Koordinaten (`latitude`, `longitude`) in DB
17. ✅ IP-Geolocation via Vercel Headers (Stadt-Level-Präzision)
18. ✅ Leaflet.js + React-Leaflet Integration
19. ✅ Heatmap-Komponente mit präzisen Koordinaten-Markern
20. ✅ Fallback auf Land-Aggregation für alte Daten
21. ✅ DSGVO-konform (IP wird sofort verworfen, nur Koordinaten gespeichert)

### **Phase 5: Premium Features** 🚧 (Nächste Schritte)

22. [ ] **CSV Export** für Brewery+ Tier
    - Export von Scan-Daten als CSV-Download
    - Filterung nach Zeitraum, Bier, Region
    - Implementierung: `exportAnalyticsCSV()` Server Action
23. [ ] **Date Range Picker**
    - Custom-Zeiträume statt nur 30 Tage
    - UI-Komponente für Start/End-Datum
    - Backend-Filterung in `getBreweryAnalyticsSummary()`
24. [ ] **Brew-Drill-Down**
    - Analytics pro Bier (nicht nur Gesamt-Brewery)
    - Route: `/team/[breweryId]/analytics/brew/[brewId]`
    - Vergleich zwischen verschiedenen Bieren
25. [ ] **Conversion Tracking aktivieren**
    - `trackConversion()` Funktion in Rating-Formular einbauen
    - Conversion-Rate-Chart im Dashboard
    - Funnel-Analyse: Scan → Rating → Remix

26. [ ] **Performance-Optimierung**
    - Caching-Layer für Analytics-Queries (Vercel KV/Redis)
    - Materialized Views für häufige Aggregationen
    - Rate-Limiting für Export-Funktionen

### **Phase 6: Enterprise Features** 🔮 (Langfristig, Optional)

27. [ ] **API-Zugriff** für Enterprise-Kunden
    - REST API für Analytics-Daten
    - API-Keys + Rate-Limiting
    - Dokumentation mit OpenAPI Spec
28. [ ] **Webhooks**
    - Event-basierte Benachrichtigungen
    - Beispiel: "Alert bei 100+ Scans/Tag"
    - Konfiguration im Dashboard
29. [ ] **Custom Reports & E-Mail**
    - Wöchentliche/monatliche Report-E-Mails
    - PDF-Export mit Branding
    - Scheduled Reports via Cronjob
30. [ ] **Machine Learning Features**
    - Scan-Trends-Vorhersage
    - Anomalie-Erkennung (ungewöhnliche Aktivität)
    - Empfehlungen für optimale Release-Zeiten

---

## 9. Testing-Strategie

### 9.1 Unit-Tests

**Testfälle für `trackBottleScan()`:**

- ✅ Anonyme Scans werden korrekt gespeichert
- ✅ IP-Anonymisierung funktioniert (nur erste 3 Oktette)
- ✅ Opt-Out-User werden nicht getrackt
- ✅ Device-Type-Detection funktioniert
- ✅ Fehlertoleranz (Tracking-Fehler crashen nicht die App)

### 9.2 Integration-Tests

**Testszenarien:**

1. QR-Code scannen (als anonymer User) → Scan wird in DB gespeichert
2. QR-Code scannen (als eingeloggter User) → `viewer_user_id` wird gesetzt
3. QR-Code scannen (als Opt-Out-User) → Kein Scan in DB
4. Analytics-Page laden (als Free-User) → Premium-Lock-Screen wird angezeigt
5. Analytics-Page laden (als Premium-User) → Daten werden korrekt dargestellt
6. Analytics-Tab wird nur in Navigation angezeigt, wenn Brewery Premium hat
7. Nicht-Owner können Analytics-Page nicht aufrufen (403/Redirect)

### 9.3 Performance-Tests

**Benchmark-Ziele:**

- ✅ `trackBottleScan()` sollte < 100ms dauern (non-blocking)
- ✅ Analytics-Queries sollten < 500ms dauern (mit Index-Optimierung)
- ✅ Dashboard-Load < 2s (bei 10.000 Scans)

---

## 10. Monetarisierungs-Strategie

### 10.1 Tier-Features

| Tier           | Analytics-Zugriff     | Details                                            |
| -------------- | --------------------- | -------------------------------------------------- |
| **Free**       | ❌ Kein Zugriff       | Nur Basic-Scan-Counter pro Flasche                 |
| **Brewer**     | ✅ Basic Analytics    | 30-Tage-Zeitraum, Top 5 Biere, Top 10 Regionen     |
| **Brewery**    | ✅ Advanced Analytics | 90-Tage-Zeitraum, Unbegrenzte Listen, Export       |
| **Enterprise** | ✅ Full Analytics     | Unbegrenzter Zeitraum, API-Zugriff, Custom-Reports |

### 10.2 Upsell-Trigger

**Im Scan-Counter (Free-User):**

> "🔒 **Upgrade auf Brewer**, um zu sehen, **wo** deine Biere getrunken werden!"

**In Analytics-Page (Brewer-User):**

> "🚀 **Upgrade auf Brewery**, um Daten als CSV zu exportieren und 90-Tage-Trends zu sehen."

---

## 11. Privacy & Compliance Checklist

### 11.1 DSGVO-Anforderungen (Privacy-First) ✅

- [x] **Keine IP-Speicherung:** IPs werden flüchtig verarbeitet und sofort verworfen.
- [x] **Hobby-Friendly:** Kein AV-Vertrag nötig für private Nutzung.
- [x] **Privacy-Hash:** Tägliche Rotation verhindert Profilbildung.
- [x] **Datensparsamkeit:** Nur relevante Geo-Infos (Stadt/Land) werden behalten.
- [x] Recht auf Löschung (bei Account-Deletion werden Scans anonymisiert)
- [x] Privacy Policy Update (QR-Scan-Tracking-Sektion)
- [x] Keine sensiblen Daten in `payload` (keine Prompts, keine PII)

### 11.2 Rechtliche Basis

**Rechtsgrundlage:** Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO)
**Zweck:** Produktverbesserung, Business Intelligence für Brauereien
**Interessenabwägung:** Minimale Datenerfassung (anonymisierte IP) vs. legitimes Geschäftsinteresse

---

## 12. Success-Metriken

### 12.1 Produkt-KPIs

- **Adoption-Rate:** % der Premium-Brauereien, die Analytics nutzen (Ziel: >60%)
- **Engagement:** Durchschnittliche Visits pro Woche in Analytics-Page (Ziel: 3+)
- **Scan-Wachstum:** Wöchentliche Scan-Rate (Ziel: +10% Week-over-Week)

### 12.2 Business-KPIs

- **Conversion-Impact:** Upgrade-Rate nach Analytics-Feature-Launch (Ziel: +15%)
- **Retention:** Churn-Rate von Premium-Brauereien (Ziel: <5% monatlich)
- **NPS:** Net Promoter Score für Analytics-Feature (Ziel: >50)

---

## 13. Offene Fragen & Entscheidungen

1. **IP-Geolocation:**
   - Jetzt umsetzen oder in Phase 4?
   - Welcher Service? (MaxMind vs. ipapi.co)
   - **Empfehlung:** Phase 4, Start mit anonymisierter IP-Region

2. **Real-Time vs. Batch-Processing:**
   - Sollen Scans sofort in Analytics sichtbar sein?
   - Oder Aggregierung alle 15 Minuten (Caching)?
   - **Empfehlung:** Start mit Real-Time, Caching bei Performance-Problemen

3. **Export-Funktion:**
   - CSV-Export für Premium-User?
   - API-Zugriff für Enterprise?
   - **Empfehlung:** CSV in Phase 3, API in Phase 4

4. **Multi-Brewery-Support:**
   - Kann ein User Analytics für mehrere Brauereien sehen?
   - **Empfehlung:** Ja, durch Navigation zwischen verschiedenen `/team/[breweryId]/analytics` Seiten

---

## 14. Nächste Schritte (Priorisiert für 20.01.2026)

### 🎯 High Priority (Diese Woche)

1. **CSV Export implementieren** (Phase 5, Punkt 22)
   - Brewery+ Feature für Datenexport
   - Einfach umzusetzen, hoher Business-Value
   - Datei: `lib/actions/analytics-actions.ts` → `exportAnalyticsCSV()`
   - UI: Export-Button in Analytics-Dashboard

2. **Conversion Tracking aktivieren** (Phase 5, Punkt 25)
   - `trackConversion()` in Rating-Formular einbauen
   - Spalte `converted_to_rating` ist bereits vorbereitet
   - Conversion-Rate-Chart im Dashboard hinzufügen

3. **Date Range Picker** (Phase 5, Punkt 23)
   - Custom-Zeiträume für Analytics
   - UI-Component mit Shadcn DatePicker
   - Backend-Filterung bereits vorbereitet

### 📊 Medium Priority (Nächste Woche)

4. **Brew-Drill-Down** (Phase 5, Punkt 24)
   - Analytics pro einzelnem Bier
   - Neue Route + Page-Component
   - Vergleichsfunktion zwischen Bieren

5. **Performance-Optimierung** (Phase 5, Punkt 26)
   - Caching-Layer evaluieren (Vercel KV?)
   - Materialized Views für große Datensätze
   - Rate-Limiting für Export

### 🔮 Low Priority (Backlog)

6. **Enterprise Features** (Phase 6)
   - API-Zugriff + Webhooks
   - Custom Reports
   - ML-basierte Features

---

**Stand:** 20.01.2026  
**Phase 4 abgeschlossen:** Heatmap mit Geo-Koordinaten ✅  
**Nächstes Ziel:** Phase 5 (Premium Features)

---

**Ende der Roadmap**

Stand: 20.01.2026  
Verantwortlich: BotlLab Dev Team  
Review: Nach Phase 5 Abschluss
