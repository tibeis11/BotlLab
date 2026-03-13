import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendAnalyticsReportEmail } from "@/lib/email";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reports/dispatch
//
// Called by the pg_cron job (via pg_net) once per scheduled brewery.
// Body: { brewery_id: string }
// Header: Authorization: Bearer <CRON_SECRET>
// ─────────────────────────────────────────────────────────────────────────────

import { calcWeightedAvg } from '@/lib/rating-utils';

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let brewery_id: string | undefined;
  try {
    const body = await req.json();
    brewery_id = body?.brewery_id;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!brewery_id) {
    return NextResponse.json({ error: "Missing brewery_id" }, { status: 400 });
  }

  // ── Service-role Supabase client (no user session) ────────────────────────
  const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Missing Supabase env vars" }, { status: 500 });
  }
  const sb = createClient(supabaseUrl, serviceRoleKey);

  try {
    // ── Fetch report settings ───────────────────────────────────────────────
    const { data: settings, error: settingsErr } = await sb
      .from("analytics_report_settings")
      .select("*")
      .eq("brewery_id", brewery_id)
      .single();

    if (settingsErr || !settings) {
      return NextResponse.json(
        { error: "Report settings not found", detail: settingsErr?.message },
        { status: 404 }
      );
    }
    if (!settings.enabled || !settings.email) {
      return NextResponse.json({ ok: false, reason: "Reports disabled or no email" });
    }

    // ── Compute period ──────────────────────────────────────────────────────
    const now      = new Date();
    const periodEnd = new Date(now);
    periodEnd.setHours(0, 0, 0, 0);
    const periodStart = new Date(periodEnd);
    if (settings.frequency === "monthly") {
      periodStart.setMonth(periodStart.getMonth() - 1);
    } else {
      periodStart.setDate(periodStart.getDate() - 7);
    }
    const startIso = periodStart.toISOString();
    const endIso   = periodEnd.toISOString();

    const periodLabel = `${periodStart.toLocaleDateString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric",
    })} – ${new Date(periodEnd.getTime() - 1).toLocaleDateString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric",
    })}`;

    // ── Fetch brewery name ──────────────────────────────────────────────────
    const { data: brewery } = await sb
      .from("breweries")
      .select("name")
      .eq("id", brewery_id)
      .single();
    const breweryName = brewery?.name ?? "Deine Brauerei";

    // ── Aggregate scan metrics ──────────────────────────────────────────────
    const { data: scanStats } = await sb
      .from("analytics_daily_stats")
      .select("total_scans, unique_visitors")
      .eq("brewery_id", brewery_id)
      .gte("date", startIso)
      .lt("date", endIso);

    const totalScans     = scanStats?.reduce((s, r) => s + (r.total_scans    ?? 0), 0) ?? 0;
    const uniqueVisitors = scanStats?.reduce((s, r) => s + (r.unique_visitors ?? 0), 0) ?? 0;

    // ── Top brews (include only if setting is on) ───────────────────────────
    let topBrewsHtml = "";
    if (settings.include_top_brews) {
      const { data: scanRows } = await sb
        .from("bottle_scans")
        .select("brew_id, brews(name, style)")
        .eq("brewery_id", brewery_id)
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .not("brew_id", "is", null);

      if (scanRows && scanRows.length > 0) {
        const countMap = new Map<string, { name: string; style: string; count: number }>();
        for (const row of scanRows) {
          if (!row.brew_id) continue;
          const brewRaw = row.brews;
          const brew = (Array.isArray(brewRaw) ? brewRaw[0] : brewRaw) as { name: string; style: string } | null;
          if (!brew) continue;
          const existing = countMap.get(row.brew_id);
          if (existing) {
            existing.count++;
          } else {
            countMap.set(row.brew_id, { name: brew.name, style: brew.style, count: 1 });
          }
        }
        const sorted = Array.from(countMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        topBrewsHtml = sorted
          .map(
            (b) =>
              `<tr><td style="padding:6px 0;font-size:13px;color:#0f172a;">${b.name}</td>` +
              `<td style="padding:6px 0;font-size:13px;color:#64748b;">${b.style ?? ""}</td>` +
              `<td style="padding:6px 0;font-size:13px;color:#0891b2;text-align:right;">${b.count} Scans</td></tr>`
          )
          .join("");
        topBrewsHtml = `<table style="width:100%;border-collapse:collapse;">${topBrewsHtml}</table>`;
      }
    }

    // ── Extended metrics ────────────────────────────────────────────────────
    // 1. Verified drinker rate (converted_to_rating OR confirmed_drinking)
    const { count: verifiedCount } = await sb
      .from("bottle_scans")
      .select("*", { count: "exact", head: true })
      .eq("brewery_id", brewery_id)
      .or("converted_to_rating.eq.true,confirmed_drinking.eq.true")
      .gte("created_at", startIso)
      .lt("created_at", endIso);

    const newVerifiedDrinkers = verifiedCount ?? 0;
    const drinkerRate         = totalScans > 0
      ? parseFloat(((newVerifiedDrinkers / totalScans) * 100).toFixed(1))
      : 0;

    // 2. Peak hour from hour_distribution JSONB
    const { data: hourDistRows } = await sb
      .from("analytics_daily_stats")
      .select("hour_distribution")
      .eq("brewery_id", brewery_id)
      .gte("date", startIso)
      .lt("date", endIso)
      .not("hour_distribution", "is", null);

    let peakHour: number | null = null;
    if (hourDistRows && hourDistRows.length > 0) {
      const totals = new Array(24).fill(0);
      for (const row of hourDistRows) {
        const dist = row.hour_distribution as Record<string, number> | null;
        if (!dist) continue;
        for (let h = 0; h < 24; h++) {
          const key = h.toString();
          if (dist[key] != null) totals[h] += dist[key];
        }
      }
      let max = 0;
      for (let h = 0; h < 24; h++) {
        if (totals[h] > max) { max = totals[h]; peakHour = h; }
      }
    }

    // 3. Top positive flavor tag
    const OFF_FLAVOR_TAGS = [
      "sour", "oxidized", "diacetyl", "astringent", "metallic",
      "skunky", "lightstruck", "sulfur", "musty", "vegetal", "medicinal", "phenolic",
    ];

    const { data: brewIds } = await sb
      .from("brews")
      .select("id")
      .eq("brewery_id", brewery_id);
    const bIds = (brewIds ?? []).map((b) => b.id);

    let topFlavorTag: string | null = null;
    if (bIds.length > 0) {
      const { data: flavorRatings } = await sb
        .from("ratings")
        .select("flavor_tags")
        .in("brew_id", bIds)
        .gte("created_at", startIso)
        .not("flavor_tags", "is", null);

      if (flavorRatings && flavorRatings.length > 0) {
        const tagCount = new Map<string, number>();
        for (const r of flavorRatings) {
          const tags = r.flavor_tags as string[] | null;
          if (!tags) continue;
          for (const tag of tags) {
            const t = tag.toLowerCase().trim();
            if (OFF_FLAVOR_TAGS.includes(t)) continue;
            tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
          }
        }
        if (tagCount.size > 0) {
          topFlavorTag = [...tagCount.entries()].sort((a, b) => b[1] - a[1])[0][0];
        }
      }
    }

    // 4. Off-flavor alert count (≥3 mentions by distinct users in last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    let offFlavorAlerts = 0;
    if (bIds.length > 0) {
      const { data: ofRatings } = await sb
        .from("ratings")
        .select("brew_id, user_id, flavor_tags")
        .in("brew_id", bIds)
        .gte("created_at", thirtyDaysAgo)
        .not("flavor_tags", "is", null);

      if (ofRatings && ofRatings.length > 0) {
        // per brew+tag: count distinct users
        const brewTagUsers = new Map<string, Set<string>>();
        for (const r of ofRatings) {
          const tags = r.flavor_tags as string[] | null;
          if (!tags) continue;
          for (const tag of tags) {
            if (!OFF_FLAVOR_TAGS.includes(tag.toLowerCase().trim())) continue;
            const key = `${r.brew_id}::${tag}`;
            if (!brewTagUsers.has(key)) brewTagUsers.set(key, new Set());
            brewTagUsers.get(key)!.add(r.user_id as string);
          }
        }
        for (const users of brewTagUsers.values()) {
          if (users.size >= 3) offFlavorAlerts++;
        }
      }
    }

    // 5. Quality summary (Phase 4.6 — BotlGuide quality summary)
    let qualitySummary: {
      avgRating: number | null;
      totalRatings: number;
      bestBrew: { name: string; avgRating: number } | null;
      worstBrew: { name: string; avgRating: number } | null;
    } = { avgRating: null, totalRatings: 0, bestBrew: null, worstBrew: null };

    if (bIds.length > 0) {
      const { data: qualityRatings } = await sb
        .from("ratings")
        .select("brew_id, rating")
        .in("brew_id", bIds)
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .not("rating", "is", null);

      if (qualityRatings && qualityRatings.length > 0) {
        // Aggregate per brew
        const brewRatings = new Map<string, number[]>();
        for (const r of qualityRatings) {
          if (!r.brew_id || r.rating == null) continue;
          if (!brewRatings.has(r.brew_id)) brewRatings.set(r.brew_id, []);
          brewRatings.get(r.brew_id)!.push(r.rating as number);
        }

        // Overall avg
        const allRatings = qualityRatings.map(r => r.rating as number);
        qualitySummary.totalRatings = allRatings.length;
        qualitySummary.avgRating = parseFloat((allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1));

        // Best & worst brew
        const brewAvgs: Array<{ brewId: string; avg: number }> = [];
        for (const [brewId, ratings] of brewRatings) {
          if (ratings.length < 2) continue; // need at least 2 ratings
          brewAvgs.push({ brewId, avg: calcWeightedAvg(ratings) });
        }
        if (brewAvgs.length > 0) {
          brewAvgs.sort((a, b) => b.avg - a.avg);
          // Resolve names
          const { data: brewNames } = await sb
            .from("brews")
            .select("id, name")
            .in("id", brewAvgs.map(b => b.brewId));
          const nameMap = new Map((brewNames ?? []).map(b => [b.id, b.name]));

          const best = brewAvgs[0];
          qualitySummary.bestBrew = { name: nameMap.get(best.brewId) ?? "Unbekannt", avgRating: parseFloat(best.avg.toFixed(1)) };
          if (brewAvgs.length > 1) {
            const worst = brewAvgs[brewAvgs.length - 1];
            qualitySummary.worstBrew = { name: nameMap.get(worst.brewId) ?? "Unbekannt", avgRating: parseFloat(worst.avg.toFixed(1)) };
          }
        }
      }
    }

    // ── Send email ──────────────────────────────────────────────────────────
    await sendAnalyticsReportEmail(
      settings.email,
      breweryName,
      periodLabel,
      totalScans,
      uniqueVisitors,
      topBrewsHtml,
      brewery_id,
      { drinkerRate, newVerifiedDrinkers, topFlavorTag, peakHour, offFlavorAlerts, qualitySummary }
    );

    // ── Write log ───────────────────────────────────────────────────────────
    await sb.from("analytics_report_logs").insert({
      report_setting_id: settings.id,
      brewery_id,
      period_start: startIso,
      period_end:   endIso,
      status:       "sent",
      email_sent_to: settings.email,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reports/dispatch] unexpected error", err);
    return NextResponse.json(
      { error: "Internal server error", detail: String(err) },
      { status: 500 }
    );
  }
}
