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
import { Mail, Clock, TrendingUp, Calendar, CheckCircle2, XCircle, Loader2, Eye, Send } from "lucide-react";
import CustomSelect from "@/app/components/CustomSelect";

type Props = {
  breweryId: string;
};

export default function ReportSettingsPanel({ breweryId }: Props) {
  const [settings, setSettings] = useState<ReportSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
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
      <div className="bg-black rounded-lg p-6 border border-zinc-800">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-cyan-900/20 border border-cyan-800/30 rounded-lg">
            <Mail className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-1">E-Mail Reports</h2>
            <p className="text-zinc-400 text-sm">
              Automatische Analytics-Updates direkt in dein Postfach.
            </p>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-black rounded-lg border border-zinc-800 p-6 sm:p-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-900">
             <h3 className="text-base font-bold text-white uppercase tracking-wider">Einstellungen</h3>
             <div className="flex items-center gap-3">
                <input
                    type="checkbox"
                    id="enabled"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="w-5 h-5 rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-black cursor-pointer"
                />
                <label htmlFor="enabled" className={`text-sm font-medium cursor-pointer select-none ${enabled ? 'text-white' : 'text-zinc-500'}`}>
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
                    <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                    Empfänger E-Mail
                    </label>
                    <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@brauerei.de"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-700 focus:border-cyan-500 outline-none transition-colors"
                    />
                </div>

                 {/* Content Preferences */}
                <div>
                    <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                    Inhalte
                    </label>
                    <div className="space-y-3 bg-zinc-900/30 p-4 rounded-lg border border-zinc-800/50">
                    <div className="flex items-center gap-3">
                        <input
                        type="checkbox"
                        id="topBrews"
                        checked={includeTopBrews}
                        onChange={(e) => setIncludeTopBrews(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-offset-black"
                        />
                        <label htmlFor="topBrews" className="text-zinc-300 text-sm select-none cursor-pointer">
                        Top Rezepte Liste
                        </label>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                        type="checkbox"
                        id="geographic"
                        checked={includeGeographic}
                        onChange={(e) => setIncludeGeographic(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-offset-black"
                        />
                        <label htmlFor="geographic" className="text-zinc-300 text-sm select-none cursor-pointer">
                        Geografische Verteilung
                        </label>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                        type="checkbox"
                        id="deviceStats"
                        checked={includeDeviceStats}
                        onChange={(e) => setIncludeDeviceStats(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-offset-black"
                        />
                        <label htmlFor="deviceStats" className="text-zinc-300 text-sm select-none cursor-pointer">
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
                    <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                    Intervall
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800">
                    <button
                        onClick={() => setFrequency("weekly")}
                        className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        frequency === "weekly"
                            ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                        }`}
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        Wöchentlich
                    </button>
                    <button
                        onClick={() => setFrequency("monthly")}
                        className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        frequency === "monthly"
                            ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                        }`}
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        Monatlich
                    </button>
                    </div>
                </div>

                {/* Send Day */}
                <div>
                    <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
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
                        className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:border-cyan-500 outline-none"
                    />
                    )}
                    <p className="text-[10px] text-zinc-600 mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                         Versand erfolgt um ca. 09:00 Uhr
                    </p>
                </div>
             </div>

          </div>

          

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-900">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-6 py-2.5 bg-white text-black font-bold text-sm rounded-md hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
            <div className="flex gap-3 w-full sm:w-auto">
                <button
                onClick={handlePreview}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-black border border-zinc-800 text-zinc-300 font-medium text-sm rounded-md hover:text-white hover:border-zinc-700 transition-all flex items-center justify-center gap-2"
                >
                <Eye className="w-4 h-4" />
                Vorschau
                </button>
                <button
                onClick={handleSendTest}
                disabled={sendingTest || !email}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-black border border-zinc-800 text-zinc-300 font-medium text-sm rounded-md hover:text-white hover:border-zinc-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
        <div className="bg-black rounded-lg p-6 border border-zinc-800">
          <h3 className="text-base font-bold text-white uppercase tracking-wider mb-6">Versand-Historie</h3>
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-4 p-3 hover:bg-zinc-900/50 rounded-lg transition-colors border border-transparent hover:border-zinc-800/50">
                {log.status === "sent" ? (
                  <div className="p-1.5 rounded-full bg-emerald-900/20 text-emerald-500">
                      <CheckCircle2 className="w-4 h-4" />
                  </div>
                ) : log.status === "failed" ? (
                  <div className="p-1.5 rounded-full bg-red-900/20 text-red-500">
                      <XCircle className="w-4 h-4" />
                  </div>
                ) : (
                   <div className="p-1.5 rounded-full bg-amber-900/20 text-amber-500">
                      <Clock className="w-4 h-4" />
                   </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-zinc-300 text-sm font-medium flex items-center gap-2">
                    <span>Versand an {email}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-500 font-normal">{new Date(log.created_at).toLocaleDateString("de-DE", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5 font-mono">
                    Zeitraum: {new Date(log.period_start).toLocaleDateString()} - {new Date(log.period_end).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-xs font-mono text-zinc-500 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                  {log.total_scans} Scans
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowPreview(false)}
        >
          <div 
            className="bg-black rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-zinc-800 flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-800 bg-black flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">E-Mail Vorschau</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-zinc-950 p-8 custom-scrollbar">
              <div className="max-w-[600px] mx-auto bg-white rounded-lg shadow-sm overflow-hidden text-slate-900">
                {/* Email Header */}
                <div className="bg-slate-50 p-8 border-b border-slate-100">
                  <div className="w-32 h-8 bg-zinc-200 mb-6 rounded flex items-center justify-center text-zinc-400 text-xs font-bold uppercase tracking-widest">
                    Logo
                  </div>
                  <h1 className="text-xl font-bold text-slate-900 mb-2">Dein Analytics Report 📈</h1>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Hier ist die Zusammenfassung für <strong>{previewData.brewery_name}</strong> im Zeitraum {new Date(previewData.period_start).toLocaleDateString()} bis {new Date(previewData.period_end).toLocaleDateString()}.
                  </p>
                </div>

                <div className="p-8">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-white border border-slate-200 rounded-lg p-5 text-center shadow-sm">
                            <p className="text-3xl font-black text-slate-900 m-0">{previewData.summary.total_scans}</p>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1 m-0">Scans</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-5 text-center shadow-sm">
                            <p className="text-3xl font-black text-cyan-600 m-0">{previewData.summary.unique_visitors}</p>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1 m-0">Visitors</p>
                        </div>
                    </div>

                    {/* Top Brews */}
                    {includeTopBrews && previewData.top_brews.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Top Performance</h3>
                        <div className="space-y-3">
                        {previewData.top_brews.map((brew) => (
                            <div key={brew.brew_id} className="flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-slate-800 text-sm">{brew.brew_name}</div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">{brew.brew_style}</div>
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
                        <a href="#" className="inline-block px-6 py-3 bg-black text-white font-bold text-sm rounded-md hover:bg-slate-800 no-underline">
                            Zum Dashboard
                        </a>
                    </div>
                </div>
                
                <div className="bg-slate-50 p-6 text-center border-t border-slate-100/50">
                    <p className="text-[10px] text-slate-400 m-0">
                    Du erhältst diesen Report basierend auf deinen Einstellungen. <a href="#" className="text-slate-600 underline">Einstellungen ändern</a>
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
