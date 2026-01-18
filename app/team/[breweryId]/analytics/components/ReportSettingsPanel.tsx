"use client";

import { useState, useEffect } from "react";
import {
  getReportSettings,
  upsertReportSettings,
  generateReportData,
  getReportLogs,
  type ReportSettings,
  type ReportData,
  type ReportFrequency,
} from "@/lib/actions/report-actions";
import { Mail, Clock, TrendingUp, Calendar, CheckCircle2, XCircle, Loader2, Eye } from "lucide-react";

type Props = {
  breweryId: string;
};

export default function ReportSettingsPanel({ breweryId }: Props) {
  const [settings, setSettings] = useState<ReportSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewData, setPreviewData] = useState<ReportData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  // Form state
  const [enabled, setEnabled] = useState(true);
  const [frequency, setFrequency] = useState<ReportFrequency>("weekly");
  const [email, setEmail] = useState("");
  const [sendDay, setSendDay] = useState(1);
  const [includeTopBrews, setIncludeTopBrews] = useState(true);
  const [includeGeographic, setIncludeGeographic] = useState(true);
  const [includeDeviceStats, setIncludeDeviceStats] = useState(true);

  useEffect(() => {
    loadSettings();
    loadLogs();
  }, [breweryId]);

  async function loadSettings() {
    try {
      const data = await getReportSettings(breweryId);
      if (data) {
        setSettings(data);
        setEnabled(data.enabled);
        setFrequency(data.frequency);
        setEmail(data.email);
        setSendDay(data.send_day);
        setIncludeTopBrews(data.include_top_brews);
        setIncludeGeographic(data.include_geographic_data);
        setIncludeDeviceStats(data.include_device_stats);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadLogs() {
    try {
      const data = await getReportLogs(breweryId, 5);
      setLogs(data);
    } catch (error) {
      console.error("Failed to load logs:", error);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await upsertReportSettings(breweryId, {
        enabled,
        frequency,
        email,
        send_day: sendDay,
        include_top_brews: includeTopBrews,
        include_geographic_data: includeGeographic,
        include_device_stats: includeDeviceStats,
      });
      await loadSettings();
      alert("Report-Einstellungen gespeichert!");
    } catch (error: any) {
      alert("Fehler: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    setShowPreview(true);
    try {
      // Generate report for last 7 or 30 days based on frequency
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (frequency === "weekly" ? 7 : 30));

      const data = await generateReportData(breweryId, startDate, endDate);
      setPreviewData(data);
    } catch (error: any) {
      alert("Fehler: " + error.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-cyan-500/10 rounded-lg">
            <Mail className="w-6 h-6 text-cyan-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-2">E-Mail Reports</h2>
            <p className="text-zinc-400 text-sm">
              Erhalte automatisch wöchentliche oder monatliche Analytics-Zusammenfassungen per E-Mail.
              <span className="text-amber-500 ml-2">🚧 E-Mail-Versand wird bald integriert (Resend/Sendgrid)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <h3 className="text-lg font-bold text-white mb-4">Einstellungen</h3>
        
        <div className="space-y-4">
          {/* Enable/Disable */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-cyan-500 focus:ring-cyan-500"
            />
            <label htmlFor="enabled" className="text-white font-medium">
              Reports aktivieren
            </label>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              E-Mail-Adresse
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="deine@email.de"
              className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:border-cyan-500 outline-none"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Häufigkeit
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFrequency("weekly")}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  frequency === "weekly"
                    ? "bg-cyan-500 text-black"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Wöchentlich
              </button>
              <button
                onClick={() => setFrequency("monthly")}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  frequency === "monthly"
                    ? "bg-cyan-500 text-black"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Monatlich
              </button>
            </div>
          </div>

          {/* Send Day */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Versand-Tag
            </label>
            {frequency === "weekly" ? (
              <select
                value={sendDay}
                onChange={(e) => setSendDay(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-cyan-500 outline-none"
              >
                <option value={1}>Montag</option>
                <option value={2}>Dienstag</option>
                <option value={3}>Mittwoch</option>
                <option value={4}>Donnerstag</option>
                <option value={5}>Freitag</option>
                <option value={6}>Samstag</option>
                <option value={7}>Sonntag</option>
              </select>
            ) : (
              <input
                type="number"
                min="1"
                max="28"
                value={sendDay}
                onChange={(e) => setSendDay(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-cyan-500 outline-none"
              />
            )}
            <p className="text-xs text-zinc-600 mt-1">
              {frequency === "weekly"
                ? "Wochentag, an dem der Report versendet wird"
                : "Tag im Monat (1-28), an dem der Report versendet wird"}
            </p>
          </div>

          {/* Content Preferences */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-3">
              Report-Inhalte
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="topBrews"
                  checked={includeTopBrews}
                  onChange={(e) => setIncludeTopBrews(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-cyan-500"
                />
                <label htmlFor="topBrews" className="text-white text-sm">
                  Top Rezepte
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="geographic"
                  checked={includeGeographic}
                  onChange={(e) => setIncludeGeographic(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-cyan-500"
                />
                <label htmlFor="geographic" className="text-white text-sm">
                  Geografische Daten
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="deviceStats"
                  checked={includeDeviceStats}
                  onChange={(e) => setIncludeDeviceStats(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-cyan-500"
                />
                <label htmlFor="deviceStats" className="text-white text-sm">
                  Geräte-Statistiken
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                  Speichern...
                </>
              ) : (
                "Einstellungen speichern"
              )}
            </button>
            <button
              onClick={handlePreview}
              className="px-6 py-3 bg-zinc-800 text-white font-bold rounded-lg hover:bg-zinc-700 transition-all"
            >
              <Eye className="w-4 h-4 inline mr-2" />
              Vorschau
            </button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPreview(false)}
        >
          <div 
            className="bg-zinc-900 rounded-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto border border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-zinc-800 sticky top-0 bg-zinc-900">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Report-Vorschau</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Header */}
              <div>
                <h4 className="text-2xl font-bold text-white mb-2">
                  {previewData.brewery_name} Analytics
                </h4>
                <p className="text-zinc-400">
                  {previewData.period_start} bis {previewData.period_end}
                </p>
              </div>

              {/* Summary */}
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <h5 className="text-sm font-bold text-zinc-400 mb-3">Zusammenfassung</h5>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-white">{previewData.summary.total_scans}</div>
                    <div className="text-xs text-zinc-500">Gesamt-Scans</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{previewData.summary.unique_visitors}</div>
                    <div className="text-xs text-zinc-500">Unique Visitors</div>
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${previewData.summary.growth_percentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {previewData.summary.growth_percentage > 0 ? '+' : ''}{previewData.summary.growth_percentage}%
                    </div>
                    <div className="text-xs text-zinc-500">Wachstum</div>
                  </div>
                </div>
              </div>

              {/* Top Brews */}
              {includeTopBrews && previewData.top_brews.length > 0 && (
                <div>
                  <h5 className="text-sm font-bold text-zinc-400 mb-3">🏆 Top Rezepte</h5>
                  <div className="space-y-2">
                    {previewData.top_brews.map((brew, idx) => (
                      <div key={brew.brew_id} className="flex items-center gap-3 bg-zinc-800/50 rounded-lg p-3">
                        <div className="text-lg font-bold text-zinc-600">#{idx + 1}</div>
                        <div className="flex-1">
                          <div className="text-white font-medium">{brew.brew_name}</div>
                          <div className="text-xs text-zinc-500">{brew.brew_style}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold">{brew.scan_count}</div>
                          <div className="text-xs text-zinc-500">{brew.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Geographic Data */}
              {includeGeographic && previewData.geographic_data.length > 0 && (
                <div>
                  <h5 className="text-sm font-bold text-zinc-400 mb-3">🌍 Länder</h5>
                  <div className="space-y-2">
                    {previewData.geographic_data.slice(0, 5).map((geo) => (
                      <div key={geo.country_code} className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-3">
                        <span className="text-white">{geo.country_name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-white font-bold">{geo.scan_count}</span>
                          <span className="text-xs text-zinc-500">{geo.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Device Stats */}
              {includeDeviceStats && previewData.device_stats.length > 0 && (
                <div>
                  <h5 className="text-sm font-bold text-zinc-400 mb-3">📱 Geräte</h5>
                  <div className="grid grid-cols-3 gap-3">
                    {previewData.device_stats.map((device) => (
                      <div key={device.device_type} className="bg-zinc-800/50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-white">{device.percentage}%</div>
                        <div className="text-xs text-zinc-500 capitalize">{device.device_type}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Logs */}
      {logs.length > 0 && (
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h3 className="text-lg font-bold text-white mb-4">Versand-Historie</h3>
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                {log.status === "sent" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : log.status === "failed" ? (
                  <XCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-500" />
                )}
                <div className="flex-1">
                  <div className="text-white text-sm">
                    {log.period_start} bis {log.period_end}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {log.total_scans} Scans • {log.unique_visitors} Unique Visitors
                  </div>
                </div>
                <div className="text-xs text-zinc-600">
                  {new Date(log.created_at).toLocaleDateString("de-DE")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
