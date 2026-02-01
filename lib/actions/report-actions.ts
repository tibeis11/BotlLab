"use server";

import { createClient } from "@/lib/supabase-server";
import { sendAnalyticsReportEmail } from "@/lib/email";

// =====================================================
// TYPES
// =====================================================

export type ReportFrequency = "weekly" | "monthly";

export type ReportSettings = {
  id: string;
  user_id: string;
  brewery_id: string;
  enabled: boolean;
  frequency: ReportFrequency;
  email: string;
  send_day: number;
  include_top_brews: boolean;
  include_geographic_data: boolean;
  include_device_stats: boolean;
  include_time_analysis: boolean;
  last_sent_at: string | null;
  send_count: number;
};

export type ReportData = {
  brewery_name: string;
  period_start: string;
  period_end: string;
  summary: {
    total_scans: number;
    unique_visitors: number;
    growth_percentage: number; // vs previous period
  };
  top_brews: Array<{
    brew_id: string;
    brew_name: string;
    brew_style: string;
    scan_count: number;
    percentage: number;
  }>;
  geographic_data: Array<{
    country_code: string;
    country_name: string;
    scan_count: number;
    percentage: number;
  }>;
  device_stats: Array<{
    device_type: string;
    scan_count: number;
    percentage: number;
  }>;
  time_analysis?: Array<{
    hour: number;
    scan_count: number;
  }>;
};

// =====================================================
// REPORT SETTINGS CRUD
// =====================================================

/**
 * Get report settings for a brewery
 */
export async function getReportSettings(breweryId: string): Promise<ReportSettings | null> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("analytics_report_settings")
    .select("*")
    .eq("brewery_id", breweryId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }

  return {
    ...data,
    frequency: data.frequency as ReportFrequency,
    send_count: data.send_count || 0,
    include_top_brews: data.include_top_brews ?? true,
    include_geographic_data: data.include_geographic_data ?? true,
    include_device_stats: data.include_device_stats ?? true,
    include_time_analysis: data.include_time_analysis ?? true,
  };
}

/**
 * Create or update report settings
 */
export async function upsertReportSettings(
  breweryId: string,
  settings: Partial<Omit<ReportSettings, "id" | "user_id" | "brewery_id">>
): Promise<ReportSettings> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Verify brewery ownership
  const { data: member } = await supabase
    .from("brewery_members")
    .select("role")
    .eq("brewery_id", breweryId)
    .eq("user_id", user.id)
    .single();

  if (!member || member.role !== "owner") {
    throw new Error("Only brewery owners can configure reports");
  }

  // Get user email if not provided
  let email = settings.email;
  if (!email) {
    email = user.email || "";
  }

  // Default values for required fields that might be missing in partial settings
  const upsertData = {
    user_id: user.id,
    brewery_id: breweryId,
    email,
    frequency: settings.frequency || 'weekly', // Provide default
    send_day: settings.send_day || 1, // Default to Monday/1st
    enabled: settings.enabled ?? true,
    include_top_brews: settings.include_top_brews,
    include_geographic_data: settings.include_geographic_data,
    include_device_stats: settings.include_device_stats,
    include_time_analysis: settings.include_time_analysis,
  };

  const { data, error } = await supabase
    .from("analytics_report_settings")
    .upsert(upsertData, {
      onConflict: "user_id,brewery_id"
    })
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    frequency: data.frequency as ReportFrequency,
    send_count: data.send_count || 0,
    include_top_brews: data.include_top_brews ?? true,
    include_geographic_data: data.include_geographic_data ?? true,
    include_device_stats: data.include_device_stats ?? true,
    include_time_analysis: data.include_time_analysis ?? true,
  };
}

/**
 * Delete report settings
 */
export async function deleteReportSettings(breweryId: string): Promise<void> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("analytics_report_settings")
    .delete()
    .eq("brewery_id", breweryId)
    .eq("user_id", user.id);

  if (error) throw error;
}

// =====================================================
// REPORT GENERATION
// =====================================================

/**
 * Generate report data for a brewery
 * This data can be used for email templates or preview
 */
export async function generateReportData(
  breweryId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<ReportData> {
  const supabase = await createClient();
  
  // Get brewery name
  const { data: brewery } = await supabase
    .from("breweries")
    .select("name")
    .eq("id", breweryId)
    .single();

  if (!brewery) throw new Error("Brewery not found");

  // Calculate previous period for growth comparison
  const periodDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
  const prevPeriodStart = new Date(periodStart);
  prevPeriodStart.setDate(prevPeriodStart.getDate() - periodDays);
  const prevPeriodEnd = new Date(periodStart);

  // Get current period stats
  const { data: currentStats } = await supabase
    .from("analytics_daily_stats")
    .select("total_scans, unique_visitors")
    .eq("brewery_id", breweryId)
    .gte("date", periodStart.toISOString().split("T")[0])
    .lte("date", periodEnd.toISOString().split("T")[0]);

  const totalScans = currentStats?.reduce((sum, row) => sum + (row.total_scans || 0), 0) || 0;
  const uniqueVisitors = currentStats?.reduce((sum, row) => sum + (row.unique_visitors || 0), 0) || 0;

  // Get previous period stats for growth calculation
  const { data: prevStats } = await supabase
    .from("analytics_daily_stats")
    .select("total_scans")
    .eq("brewery_id", breweryId)
    .gte("date", prevPeriodStart.toISOString().split("T")[0])
    .lt("date", prevPeriodEnd.toISOString().split("T")[0]);

  const prevTotalScans = prevStats?.reduce((sum, row) => sum + (row.total_scans || 0), 0) || 0;
  const growthPercentage = prevTotalScans > 0
    ? Math.round(((totalScans - prevTotalScans) / prevTotalScans) * 100)
    : 0;

  // Get top brews
  const { data: brewStats } = await supabase
    .from("analytics_daily_stats")
    .select("brew_id, total_scans")
    .eq("brewery_id", breweryId)
    .gte("date", periodStart.toISOString().split("T")[0])
    .lte("date", periodEnd.toISOString().split("T")[0])
    .not("brew_id", "is", null);

  // Aggregate by brew_id
  const brewMap = new Map<string, number>();
  brewStats?.forEach(stat => {
    if (stat.brew_id) {
      brewMap.set(stat.brew_id, (brewMap.get(stat.brew_id) || 0) + stat.total_scans);
    }
  });

  // Get brew details
  const brewIds = Array.from(brewMap.keys());
  const { data: brews } = await supabase
    .from("brews")
    .select("id, name, style")
    .in("id", brewIds);

  const topBrews = Array.from(brewMap.entries())
    .map(([brewId, scanCount]) => {
      const brew = brews?.find(b => b.id === brewId);
      return {
        brew_id: brewId,
        brew_name: brew?.name || "Unknown",
        brew_style: brew?.style || "Unknown",
        scan_count: scanCount,
        percentage: totalScans > 0 ? Math.round((scanCount / totalScans) * 100) : 0,
      };
    })
    .sort((a, b) => b.scan_count - a.scan_count)
    .slice(0, 5);

  // Get geographic data
  const { data: geoStats } = await supabase
    .from("analytics_daily_stats")
    .select("country_code, total_scans")
    .eq("brewery_id", breweryId)
    .gte("date", periodStart.toISOString().split("T")[0])
    .lte("date", periodEnd.toISOString().split("T")[0])
    .not("country_code", "is", null);

  const geoMap = new Map<string, number>();
  geoStats?.forEach(stat => {
    if (stat.country_code) {
      geoMap.set(stat.country_code, (geoMap.get(stat.country_code) || 0) + stat.total_scans);
    }
  });

  const geographicData = Array.from(geoMap.entries())
    .map(([countryCode, scanCount]) => ({
      country_code: countryCode,
      country_name: getCountryName(countryCode),
      scan_count: scanCount,
      percentage: totalScans > 0 ? Math.round((scanCount / totalScans) * 100) : 0,
    }))
    .sort((a, b) => b.scan_count - a.scan_count)
    .slice(0, 10);

  // Get device stats
  const { data: deviceStats } = await supabase
    .from("analytics_daily_stats")
    .select("device_type, total_scans")
    .eq("brewery_id", breweryId)
    .gte("date", periodStart.toISOString().split("T")[0])
    .lte("date", periodEnd.toISOString().split("T")[0])
    .not("device_type", "is", null);

  const deviceMap = new Map<string, number>();
  deviceStats?.forEach(stat => {
    if (stat.device_type) {
      deviceMap.set(stat.device_type, (deviceMap.get(stat.device_type) || 0) + stat.total_scans);
    }
  });

  const deviceData = Array.from(deviceMap.entries())
    .map(([deviceType, scanCount]) => ({
      device_type: deviceType,
      scan_count: scanCount,
      percentage: totalScans > 0 ? Math.round((scanCount / totalScans) * 100) : 0,
    }))
    .sort((a, b) => b.scan_count - a.scan_count);

  return {
    brewery_name: brewery.name,
    period_start: periodStart.toISOString().split("T")[0],
    period_end: periodEnd.toISOString().split("T")[0],
    summary: {
      total_scans: totalScans,
      unique_visitors: uniqueVisitors,
      growth_percentage: growthPercentage,
    },
    top_brews: topBrews,
    geographic_data: geographicData,
    device_stats: deviceData,
  };
}

/**
 * Get recent report logs for a brewery
 */
export async function getReportLogs(breweryId: string, limit = 10) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("analytics_report_logs")
    .select("*")
    .eq("brewery_id", breweryId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// =====================================================
// HELPERS
// =====================================================

function getCountryName(code: string): string {
  const countries: Record<string, string> = {
    DE: "Deutschland",
    AT: "Österreich",
    CH: "Schweiz",
    US: "USA",
    GB: "Großbritannien",
    FR: "Frankreich",
    IT: "Italien",
    ES: "Spanien",
    NL: "Niederlande",
    BE: "Belgien",
    DK: "Dänemark",
    SE: "Schweden",
    NO: "Norwegen",
    PL: "Polen",
    CZ: "Tschechien",
  };
  return countries[code] || code;
}

/**
 * Send a test report immediately
 */
export async function sendTestReport(breweryId: string, email: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Verify access (basic check)
  const { data: member } = await supabase
    .from("brewery_members")
    .select("role")
    .eq("brewery_id", breweryId)
    .eq("user_id", user.id)
    .single();

  if (!member) throw new Error("Not authorized");

  // Generate data for last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const reportData = await generateReportData(breweryId, startDate, endDate);

  // Format HTML for brew list
  const topBrewsList = reportData.top_brews.map(b => 
    `<div class="brew-row">
      <div style="display:flex;justify-content:space-between;">
        <span style="font-weight:600;color:#0f1720">${b.brew_name}</span>
        <span style="font-weight:700;color:#08b5d6">${b.scan_count}</span>
      </div>
      <div style="font-size:12px;color:#64748b">${b.brew_style}</div>
    </div>`
  ).join("");

  // Send email
  const result = await sendAnalyticsReportEmail(
    email,
    reportData.brewery_name,
    `${reportData.period_start} - ${reportData.period_end}`,
    reportData.summary.total_scans,
    reportData.summary.unique_visitors,
    topBrewsList || '<p style="color:#64748b;font-style:italic">Keine Daten verfügbar</p>',
    breweryId
  );

  if (!result.success) {
    throw new Error("Fehler beim Senden der E-Mail: " + result.error);
  }

  // Log it (optional: skip if we don't have settings id easily, or fetch it)
  /*
  await supabase.from("analytics_report_logs").insert({
    brewery_id: breweryId,
    email_sent_to: email,
    status: "sent",
    period_start: reportData.period_start,
    period_end: reportData.period_end,
    report_setting_id: "...", // Required but we don't have it here without extra fetch
  });
  */

  return { success: true };
}
