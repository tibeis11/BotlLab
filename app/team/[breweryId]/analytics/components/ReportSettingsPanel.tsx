"use client";

import { useState, useEffect } from "react";
import {
  getReportSettings,
  upsertReportSettings,
  generateReportData,
  getReportLogs,
  sendTestReport,
  type ReportSettings,
  type ReportData,
  type ReportFrequency,
} from "@/lib/actions/report-actions";
import { Mail, Clock, TrendingUp, Calendar, CheckCircle2, XCircle, Loader2, Eye, Send, Shield, Info } from "lucide-react";
import CustomSelect from "@/app/components/CustomSelect";
import { useAuth } from "@/app/context/AuthContext";

type Props = {
  breweryId: string;
};

export default function ReportSettingsPanel({ breweryId }: Props) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ReportSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [previewData, setPreviewData] = useState<ReportData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  // Form state — default to disabled
  const [enabled, setEnabled] = useState(false);
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

  // Pre-fill email from auth user if no settings exist yet
  useEffect(() => {
    if (!settings && user?.email && !email) {
      setEmail(user.email);
    }
  }, [user, settings]);

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

  async function handleSendTest() {
    if (!email) {
      alert("Bitte gib eine E-Mail-Adresse an.");
      return;
    }
    setSendingTest(true);
    try {
      await sendTestReport(breweryId, email);
      alert("Test-Report wurde versendet!");
      loadLogs();
    } catch (error: any) {
      alert("Fehler: " + error.message);
    } finally {
      setSendingTest(false);
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-surface rounded-2xl p-6 border border-border">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-cyan-900/20 border border-cyan-800/30 rounded-lg">
            <Mail className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-text-primary mb-1">E-Mail Reports</h2>
            <p className="text-text-secondary text-sm">
              Automatische Analytics-Updates direkt in dein Postfach.
            </p>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
             <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Einstellungen</h3>
             <div className="flex items-center gap-3">
                <input
                    type="checkbox"
                    id="enabled"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="w-5 h-5 rounded border-border-hover bg-surface text-cyan-500 focus:ring-cyan-500 focus:ring-offset-black cursor-pointer"
                />
                <label htmlFor="enabled" className={`text-sm font-bold cursor-pointer select-none ${enabled ? 'text-text-primary' : 'text-text-muted'}`}>
                    {enabled ? 'Aktiviert' : 'Deaktiviert'}
                </label>
             </div>
        </div>
        
        <div className={`space-y-8 transition-opacity duration-200 ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             
             {/* Left Column */}
             <div className="space-y-6">
                 {/* Email */}
                <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                    Empfänger E-Mail
                    </label>
                    <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@brauerei.de"
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text-primary placeholder:text-text-disabled focus:border-cyan-500 outline-none transition-colors"
                    />
                </div>

                 {/* Content Preferences */}
                <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
                    Inhalte
                    </label>
                    <div className="space-y-3 bg-surface/30 p-4 rounded-lg border border-border-subtle">
                    <div className="flex items-center gap-3">
                        <input
                        type="checkbox"
                        id="topBrews"
                        checked={includeTopBrews}
                        onChange={(e) => setIncludeTopBrews(e.target.checked)}
                        className="w-4 h-4 rounded border-border-hover bg-surface text-cyan-500 focus:ring-offset-black"
                        />
                        <label htmlFor="topBrews" className="text-text-secondary text-sm select-none cursor-pointer">
                        Top Rezepte Liste
                        </label>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                        type="checkbox"
                        id="geographic"
                        checked={includeGeographic}
                        onChange={(e) => setIncludeGeographic(e.target.checked)}
                        className="w-4 h-4 rounded border-border-hover bg-surface text-cyan-500 focus:ring-offset-black"
                        />
                        <label htmlFor="geographic" className="text-text-secondary text-sm select-none cursor-pointer">
                        Geografische Verteilung
                        </label>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                        type="checkbox"
                        id="deviceStats"
                        checked={includeDeviceStats}
                        onChange={(e) => setIncludeDeviceStats(e.target.checked)}
                        className="w-4 h-4 rounded border-border-hover bg-surface text-cyan-500 focus:ring-offset-black"
                        />
                        <label htmlFor="deviceStats" className="text-text-secondary text-sm select-none cursor-pointer">
                        Geräte-Statistiken
                        </label>
                    </div>
                    </div>
                </div>
             </div>

             {/* Right Column */}
             <div className="space-y-6">
                {/* Frequency */}
                <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                    Intervall
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-background p-1.5 rounded-xl border border-border">
                    <button
                        onClick={() => setFrequency("weekly")}
                        className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        frequency === "weekly"
                            ? "bg-surface-hover text-text-primary shadow-sm border border-border-hover"
                            : "text-text-muted hover:text-text-secondary hover:bg-surface"
                        }`}
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        Wöchentlich
                    </button>
                    <button
                        onClick={() => setFrequency("monthly")}
                        className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        frequency === "monthly"
                            ? "bg-surface-hover text-text-primary shadow-sm border border-border-hover"
                            : "text-text-muted hover:text-text-secondary hover:bg-surface"
                        }`}
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        Monatlich
                    </button>
                    </div>
                </div>

                {/* Send Day */}
                <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                    {frequency === "weekly" ? "Wochentag" : "Tag im Monat"}
                    </label>
                    {frequency === "weekly" ? (
                    <CustomSelect
                        value={sendDay.toString()}
                        onChange={(value) => setSendDay(Number(value))}
                        options={[
                        { value: "1", label: "Montag" },
                        { value: "2", label: "Dienstag" },
                        { value: "3", label: "Mittwoch" },
                        { value: "4", label: "Donnerstag" },
                        { value: "5", label: "Freitag" },
                        { value: "6", label: "Samstag" },
                        { value: "7", label: "Sonntag" },
                        ]}
                    />
                    ) : (
                    <input
                        type="number"
                        min="1"
                        max="28"
                        value={sendDay}
                        onChange={(e) => setSendDay(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text-primary focus:border-cyan-500 outline-none"
                    />
                    )}
                    <p className="text-[10px] text-text-disabled mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                         Versand erfolgt um ca. 09:00 Uhr
                    </p>
                </div>
             </div>

          </div>

          

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border max-w-xl">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-white text-black font-bold text-sm rounded-lg hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Speichern...
                </>
              ) : (
                "Änderungen speichern"
              )}
            </button>
            <div className="flex gap-3">
                <button
                onClick={handlePreview}
                className="px-4 py-2.5 bg-background border border-border text-text-secondary font-bold text-sm rounded-lg hover:text-text-primary hover:border-border-hover transition-all flex items-center justify-center gap-2"
                >
                <Eye className="w-4 h-4" />
                Vorschau
                </button>
                <button
                onClick={handleSendTest}
                disabled={sendingTest || !email}
                className="px-4 py-2.5 bg-background border border-border text-text-secondary font-bold text-sm rounded-lg hover:text-text-primary hover:border-border-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                title={!email ? "Bitte E-Mail angeben" : "Test-Bericht jetzt senden"}
                >
                {sendingTest ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Send className="w-4 h-4" />
                )}
                Testen
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Logs */}
      {logs.length > 0 && (
        <div className="bg-surface rounded-2xl p-6 border border-border">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-6">Versand-Historie</h3>
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-4 p-3 hover:bg-surface/50 rounded-lg transition-colors border border-transparent hover:border-border-subtle">
                {log.status === "sent" ? (
                  <div className="p-1.5 rounded-full bg-success-bg text-success">
                      <CheckCircle2 className="w-4 h-4" />
                  </div>
                ) : log.status === "failed" ? (
                  <div className="p-1.5 rounded-full bg-error-bg text-error">
                      <XCircle className="w-4 h-4" />
                  </div>
                ) : (
                   <div className="p-1.5 rounded-full bg-warning-bg text-warning">
                      <Clock className="w-4 h-4" />
                   </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-text-secondary text-sm font-bold flex items-center gap-2">
                    <span>Versand an {email}</span>
                    <span className="text-text-disabled">•</span>
                    <span className="text-text-muted font-normal">{new Date(log.created_at).toLocaleDateString("de-DE", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-xs text-text-muted mt-0.5 font-mono">
                    Zeitraum: {new Date(log.period_start).toLocaleDateString()} - {new Date(log.period_end).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-xs font-mono text-text-muted bg-surface px-2 py-1 rounded border border-border">
                  {log.total_scans} Scans
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DSGVO / Privacy Compliance Info */}
      <div className="bg-surface rounded-2xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-text-primary">Datenschutz & E-Mail-Versand</h3>
        </div>
        <div className="space-y-3 text-xs text-text-muted leading-relaxed">
          <div className="flex items-start gap-2">
            <Info className="w-3 h-3 text-text-disabled mt-0.5 shrink-0" />
            <p><strong className="text-text-secondary">Rechtsgrundlage:</strong> Der Versand erfolgt ausschließlich auf Grundlage deiner ausdrücklichen Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Du kannst die Einwilligung jederzeit widerrufen.</p>
          </div>
          <div className="flex items-start gap-2">
            <Info className="w-3 h-3 text-text-disabled mt-0.5 shrink-0" />
            <p><strong className="text-text-secondary">Dateninhalt:</strong> Die Reports enthalten ausschließlich aggregierte, anonymisierte Analytics-Daten deiner Brauerei. Es werden keine personenbezogenen Daten Dritter übermittelt.</p>
          </div>
          <div className="flex items-start gap-2">
            <Info className="w-3 h-3 text-text-disabled mt-0.5 shrink-0" />
            <p><strong className="text-text-secondary">Empfänger:</strong> Die E-Mail wird ausschließlich an die von dir angegebene Adresse versendet. Eine Weitergabe an Dritte findet nicht statt.</p>
          </div>
          <div className="flex items-start gap-2">
            <Info className="w-3 h-3 text-text-disabled mt-0.5 shrink-0" />
            <p><strong className="text-text-secondary">Widerruf & Löschung:</strong> Du kannst den Report jederzeit über diese Einstellungen oder den Abmelde-Link in jeder E-Mail deaktivieren. Versandprotokolle werden nach 90 Tagen automatisch gelöscht.</p>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div 
          className="fixed inset-0 bg-surface/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowPreview(false)}
        >
          <div 
            className="bg-background rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-border flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border bg-background flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest">E-Mail Vorschau</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-background p-8 custom-scrollbar">
              <div className="max-w-[600px] mx-auto bg-white rounded-lg shadow-sm overflow-hidden text-slate-900">
                {/* Email Header */}
                <div className="bg-slate-50 p-8 border-b border-slate-100">
                  <div className="w-32 h-8 bg-slate-200 mb-6 rounded flex items-center justify-center text-text-secondary text-xs font-bold uppercase tracking-widest">
                    Logo
                  </div>
                  <h1 className="text-xl font-bold text-slate-900 mb-2">Dein Analytics Report</h1>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Hier ist die Zusammenfassung für <strong>{previewData.brewery_name}</strong> im Zeitraum {new Date(previewData.period_start).toLocaleDateString()} bis {new Date(previewData.period_end).toLocaleDateString()}.
                  </p>
                </div>

                <div className="p-8">
                    {/* KPI Cards Row 1 */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-white border border-slate-200 rounded-lg p-5 text-center shadow-sm">
                            <p className="text-3xl font-black text-slate-900 m-0">{previewData.summary.total_scans}</p>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1 m-0">Scans</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-5 text-center shadow-sm">
                            <p className="text-3xl font-black text-cyan-600 m-0">{previewData.summary.unique_visitors}</p>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1 m-0">Visitors</p>
                        </div>
                    </div>

                    {/* KPI Cards Row 2 — Extended */}
                    {previewData.extended && (
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-white border border-slate-200 rounded-lg p-5 text-center shadow-sm">
                            <p className="text-3xl font-black text-emerald-600 m-0">{previewData.extended.drinkerRate.toFixed(1)}%</p>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1 m-0">Drinker Rate</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-5 text-center shadow-sm">
                            <p className="text-3xl font-black text-violet-600 m-0">{previewData.extended.newVerifiedDrinkers}</p>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1 m-0">Verified Drinkers</p>
                        </div>
                      </div>
                    )}

                    {/* Quality Summary */}
                    {previewData.extended?.qualitySummary?.avgRating && (
                      <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                        <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Qualitäts-Summary</p>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div>
                            <p className="text-2xl font-black text-emerald-700">{previewData.extended.qualitySummary.avgRating}</p>
                            <p className="text-[10px] text-emerald-600 uppercase">Ø Rating</p>
                          </div>
                          {previewData.extended.qualitySummary.bestBrew && (
                            <div>
                              <p className="text-sm font-bold text-emerald-700 truncate">{previewData.extended.qualitySummary.bestBrew.name}</p>
                              <p className="text-[10px] text-emerald-600 uppercase">Bester Sud ({previewData.extended.qualitySummary.bestBrew.avgRating})</p>
                            </div>
                          )}
                          {previewData.extended.qualitySummary.worstBrew && (
                            <div>
                              <p className="text-sm font-bold text-amber-700 truncate">{previewData.extended.qualitySummary.worstBrew.name}</p>
                              <p className="text-[10px] text-amber-600 uppercase">Schwächster ({previewData.extended.qualitySummary.worstBrew.avgRating})</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Top Brews */}
                    {includeTopBrews && previewData.top_brews.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Top Performance</h3>
                        <div className="space-y-3">
                        {previewData.top_brews.map((brew) => (
                            <div key={brew.brew_id} className="flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-slate-800 text-sm">{brew.brew_name}</div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wide font-bold">{brew.brew_style}</div>
                                </div>
                                <div className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded text-xs">
                                    {brew.scan_count} Scans
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                    )}

                    {/* Button */}
                    <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                        <a href="#" className="inline-block px-6 py-3 bg-background text-text-primary font-bold text-sm rounded-lg hover:bg-slate-800 no-underline">
                            Zum Dashboard
                        </a>
                    </div>
                </div>
                
                <div className="bg-slate-50 p-6 text-center border-t border-slate-100/50 space-y-2">
                    <p className="text-[10px] text-slate-400 m-0">
                      Du erhältst diesen Report, weil du ihn in deinen Analytics-Einstellungen aktiviert hast (Art. 6 Abs. 1 lit. a DSGVO).
                    </p>
                    <p className="text-[10px] text-slate-400 m-0">
                      <a href="#" className="text-slate-600 underline">Einstellungen ändern</a> · <a href="#" className="text-slate-500 underline">Report abbestellen</a>
                    </p>
                    <p className="text-[10px] text-slate-400 m-0">
                      BotlLab · <a href="https://botllab.de/impressum" className="text-slate-400 underline">Impressum</a> · <a href="https://botllab.de/privacy" className="text-slate-400 underline">Datenschutz</a>
                    </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
