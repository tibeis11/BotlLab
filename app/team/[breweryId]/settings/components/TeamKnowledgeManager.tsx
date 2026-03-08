'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText, Upload, Trash2, Loader2, CheckCircle, AlertTriangle, RefreshCw,
  BookOpen, Sparkles, X,
} from 'lucide-react';

interface TeamDocument {
  id: string;
  filename: string;
  file_size_bytes: number;
  mime_type: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  chunk_count: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface TeamKnowledgeManagerProps {
  breweryId: string;
}

export default function TeamKnowledgeManager({ breweryId }: TeamKnowledgeManagerProps) {
  const [documents, setDocuments] = useState<TeamDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textFilename, setTextFilename] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/botlguide/team-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', breweryId }),
      });
      const data = await res.json();
      if (data.error) {
        if (data.upgrade_required) {
          setError('Team-Wissen ist nur im Enterprise-Plan verfügbar.');
        } else {
          setError(data.error);
        }
        return;
      }
      setDocuments(data.documents ?? []);
      setError(null);
    } catch {
      setError('Fehler beim Laden der Dokumente.');
    } finally {
      setLoading(false);
    }
  }, [breweryId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Auto-refresh processing documents every 5s
  useEffect(() => {
    const hasProcessing = documents.some(d => d.status === 'pending' || d.status === 'processing');
    if (!hasProcessing) return;
    const interval = setInterval(loadDocuments, 5000);
    return () => clearInterval(interval);
  }, [documents, loadDocuments]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Extract text client-side for PDFs using pdf.js or read as text
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      let text = '';
      const filename = file.name;

      if (file.type === 'application/pdf') {
        // PDF: read as text (basic extraction — for complex PDFs, user should paste text)
        text = await file.text();
        // If the PDF text extraction yields mostly binary gibberish, offer text input
        const readableRatio = (text.match(/[a-zA-ZäöüÄÖÜß\s]/g) || []).length / text.length;
        if (readableRatio < 0.5) {
          setError('PDF konnte nicht als Text gelesen werden. Bitte den Text manuell eingeben.');
          setShowTextInput(true);
          setTextFilename(filename);
          setUploading(false);
          return;
        }
      } else {
        text = await file.text();
      }

      if (!text.trim()) {
        setError('Kein Text im Dokument gefunden.');
        setUploading(false);
        return;
      }

      await uploadText(filename, text);
    } catch {
      setError('Fehler beim Verarbeiten der Datei.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleTextSubmit() {
    if (!textInput.trim() || !textFilename.trim()) return;
    setUploading(true);
    setError(null);
    try {
      await uploadText(textFilename, textInput);
      setShowTextInput(false);
      setTextInput('');
      setTextFilename('');
    } catch {
      setError('Fehler beim Hochladen.');
    } finally {
      setUploading(false);
    }
  }

  async function uploadText(filename: string, text: string) {
    const res = await fetch('/api/botlguide/team-knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upload', breweryId, filename, text }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    setSuccess(`"${filename}" wird verarbeitet. Embeddings werden generiert…`);
    loadDocuments();
  }

  async function handleDelete(documentId: string, filename: string) {
    if (!confirm(`"${filename}" wirklich löschen? Alle zugehörigen Chunks werden entfernt.`)) return;
    try {
      const res = await fetch('/api/botlguide/team-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', breweryId, documentId }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setSuccess(`"${filename}" gelöscht.`);
      loadDocuments();
    } catch {
      setError('Fehler beim Löschen.');
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getStatusBadge(status: TeamDocument['status']) {
    switch (status) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-bg text-success border border-success/20">
            <CheckCircle className="w-3 h-3" /> Bereit
          </span>
        );
      case 'processing':
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-bg text-brand border border-brand/20">
            <Loader2 className="w-3 h-3 animate-spin" /> {status === 'pending' ? 'Warte…' : 'Verarbeitet…'}
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-error-bg text-error border border-error/20">
            <AlertTriangle className="w-3 h-3" /> Fehler
          </span>
        );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-accent-purple" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-accent-purple" />
          <h3 className="text-lg font-bold text-text-primary">Team-Wissen (SOPs & Handbücher)</h3>
        </div>
        <button
          onClick={loadDocuments}
          className="text-text-muted hover:text-text-secondary transition-colors"
          title="Aktualisieren"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <p className="text-sm text-text-muted">
        Lade SOPs, Handbücher und interne Dokumentation hoch.
        BotlGuide nutzt dieses Wissen als zusätzlichen Kontext für eure teamspezifischen Fragen.
      </p>

      {/* Alerts */}
      {error && (
        <div className="bg-error-bg border border-error/20 rounded-lg p-3 text-sm text-error flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-error hover:opacity-80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {success && (
        <div className="bg-success-bg border border-success/20 rounded-lg p-3 text-sm text-success flex items-start gap-2">
          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto text-success hover:opacity-80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Upload Area */}
      <div className="bg-surface rounded-2xl border border-border p-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex-1 cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.pdf,.csv"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
            <div className="flex items-center justify-center gap-3 px-4 py-3 border-2 border-dashed border-border-hover rounded-lg hover:border-accent-purple hover:bg-accent-purple/10 transition-colors">
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin text-accent-purple" />
              ) : (
                <Upload className="w-5 h-5 text-accent-purple" />
              )}
              <span className="text-sm text-text-secondary">
                {uploading ? 'Wird hochgeladen…' : 'Datei auswählen (.txt, .md, .pdf, .csv)'}
              </span>
            </div>
          </label>
          <button
            onClick={() => setShowTextInput(!showTextInput)}
            className="px-4 py-3 bg-surface-hover hover:bg-border-hover text-text-secondary rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Text einfügen
          </button>
        </div>

        {/* Manual text input */}
        {showTextInput && (
          <div className="mt-4 space-y-3">
            <input
              type="text"
              placeholder="Dokumentname (z.B. Reinigungsprotokoll.pdf)"
              value={textFilename}
              onChange={e => setTextFilename(e.target.value)}
              className="w-full px-3 py-2 bg-surface-hover border border-border-hover rounded-lg text-text-primary text-sm placeholder-text-disabled focus:ring-2 focus:ring-accent-purple focus:border-transparent"
            />
            <textarea
              placeholder="Dokumenttext hier einfügen…"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 bg-surface-hover border border-border-hover rounded-lg text-text-primary text-sm placeholder-text-disabled focus:ring-2 focus:ring-accent-purple focus:border-transparent resize-y"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">
                {textInput.length > 0 ? `${textInput.length} Zeichen` : ''}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowTextInput(false); setTextInput(''); setTextFilename(''); }}
                  className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim() || !textFilename.trim() || uploading}
                  className="px-4 py-1.5 bg-accent-purple hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3" />
                  Verarbeiten & Einbetten
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="bg-surface/50 rounded-2xl border border-border p-12 text-center">
          <BookOpen className="w-10 h-10 text-text-disabled mx-auto mb-3" />
          <p className="text-text-muted text-sm">Noch keine Dokumente hochgeladen.</p>
          <p className="text-text-disabled text-xs mt-1">
            Lade SOPs oder Handbücher hoch, damit BotlGuide euer internes Wissen nutzen kann.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="bg-surface rounded-lg border border-border p-4 flex items-center gap-4 hover:border-border-hover transition-colors"
            >
              <FileText className="w-8 h-8 text-text-disabled flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-bold text-text-primary truncate">{doc.filename}</span>
                  {getStatusBadge(doc.status)}
                </div>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span>{formatBytes(doc.file_size_bytes)}</span>
                  {doc.chunk_count && doc.chunk_count > 0 && (
                    <span>{doc.chunk_count} Chunks</span>
                  )}
                  <span>{new Date(doc.created_at).toLocaleDateString('de-DE')}</span>
                </div>
                {doc.status === 'error' && doc.error_message && (
                  <p className="text-xs text-error mt-1">{doc.error_message}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(doc.id, doc.filename)}
                className="p-2 text-text-disabled hover:text-error transition-colors flex-shrink-0"
                title="Löschen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-accent-purple/10 border border-accent-purple/20 rounded-lg p-4 flex gap-3">
        <Sparkles className="w-5 h-5 text-accent-purple flex-shrink-0 mt-0.5" />
        <div className="text-xs text-text-secondary space-y-1">
          <p className="font-bold text-text-primary">Wie funktioniert Team-Wissen?</p>
          <p>
            Hochgeladene Dokumente werden in Textfragmente zerlegt und als Vektoren gespeichert.
            Wenn ein Teammitglied BotlGuide eine Frage stellt, werden die relevantesten Fragmente
            automatisch als Kontext mitgesendet — wie ein internes Nachschlagewerk.
          </p>
          <p>
            Unterstützte Formate: .txt, .md, .csv, .pdf (nur mit Textebene).
            Für gescannte PDFs den Text bitte manuell über &quot;Text einfügen&quot; eingeben.
          </p>
        </div>
      </div>
    </div>
  );
}
