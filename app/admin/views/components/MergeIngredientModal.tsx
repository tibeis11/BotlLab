'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Search, AlertTriangle, Plus, Link, CheckCircle } from 'lucide-react';
import type { ImportQueueItem, MergeQueueOptions, DuplicateCheckResult, IngredientMasterSearchResult } from '@/lib/types/ingredients';
import { mergeQueueItem, checkIngredientDuplicate, searchIngredientMaster } from '@/lib/actions/admin-ingredient-actions';

type Tab = 'link_existing' | 'create_new';

interface MergeIngredientModalProps {
  item: ImportQueueItem;
  onClose: () => void;
  onSuccess: (itemId: string, recipesUpdated: number) => void;
}

// ── Hilfs-Hooks ───────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────

export default function MergeIngredientModal({ item, onClose, onSuccess }: MergeIngredientModalProps) {
  const [tab, setTab] = useState<Tab>('link_existing');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Tab A: Vorhandenen Master verknüpfen ──────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<IngredientMasterSearchResult[]>([]);
  const [selectedMaster, setSelectedMaster] = useState<IngredientMasterSearchResult | null>(null);
  const [searching, setSearching] = useState(false);

  // Optionales Produkt (beide Tabs)
  const [addProduct, setAddProduct] = useState(false);
  const [productName, setProductName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [colorEbc, setColorEbc] = useState('');
  const [potentialPts, setPotentialPts] = useState('');
  const [alphaPct, setAlphaPct] = useState('');
  const [attenuationPct, setAttenuationPct] = useState('');
  const [productNotes, setProductNotes] = useState('');

  // ── Tab B: Neu anlegen ────────────────────────────────────────────────────
  const [newName, setNewName] = useState(item.raw_name);
  const [newAliasInput, setNewAliasInput] = useState('');
  const [newAliases, setNewAliases] = useState<string[]>([item.raw_name]);
  const [duplicates, setDuplicates] = useState<DuplicateCheckResult[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const debouncedNewName = useDebounce(newName, 500);

  // Vorausfüllen aus raw_data
  useEffect(() => {
    const raw = item.raw_data ?? {};
    if (raw.alpha_pct != null)      setAlphaPct(String(raw.alpha_pct));
    if (raw.color_ebc != null)      setColorEbc(String(raw.color_ebc));
    if (raw.attenuation_pct != null) setAttenuationPct(String(raw.attenuation_pct));
  }, [item.raw_data]);

  // Suche in ingredient_master (Tab A)
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchIngredientMaster(debouncedSearch, item.type)
      .then(setSearchResults)
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, [debouncedSearch, item.type]);

  // Duplikat-Check (Tab B)
  useEffect(() => {
    if (tab !== 'create_new' || !debouncedNewName || debouncedNewName.length < 3) {
      setDuplicates([]);
      return;
    }
    setCheckingDuplicates(true);
    checkIngredientDuplicate(debouncedNewName, item.type, manufacturer || undefined)
      .then(setDuplicates)
      .catch(() => setDuplicates([]))
      .finally(() => setCheckingDuplicates(false));
  }, [debouncedNewName, item.type, manufacturer, tab]);

  function addAlias() {
    const trimmed = newAliasInput.trim();
    if (trimmed && !newAliases.includes(trimmed)) {
      setNewAliases(prev => [...prev, trimmed]);
    }
    setNewAliasInput('');
  }

  function removeAlias(alias: string) {
    setNewAliases(prev => prev.filter(a => a !== alias));
  }

  function buildProductPayload(): MergeQueueOptions['product'] | undefined {
    if (!addProduct && tab === 'link_existing') return undefined;
    return {
      name:            productName || item.raw_name,
      manufacturer:    manufacturer || undefined,
      color_ebc:       colorEbc ? parseFloat(colorEbc) : null,
      potential_pts:   potentialPts ? parseFloat(potentialPts) : null,
      alpha_pct:       alphaPct ? parseFloat(alphaPct) : null,
      attenuation_pct: attenuationPct ? parseFloat(attenuationPct) : null,
      notes:           productNotes || null,
    };
  }

  async function handleConfirm() {
    setError(null);
    setSaving(true);

    try {
      let options: MergeQueueOptions;

      if (tab === 'link_existing') {
        if (!selectedMaster) {
          setError('Bitte einen vorhandenen Master auswählen.');
          setSaving(false);
          return;
        }
        options = {
          queueId:  item.id,
          mode:     'link_existing',
          masterId: selectedMaster.id,
          product:  addProduct ? buildProductPayload() : undefined,
        };
      } else {
        if (!newName.trim()) {
          setError('Name darf nicht leer sein.');
          setSaving(false);
          return;
        }
        options = {
          queueId:   item.id,
          mode:      'create_new',
          newMaster: { name: newName.trim(), type: item.type, aliases: newAliases },
          product:   buildProductPayload(),
        };
      }

      const result = await mergeQueueItem(options);
      onSuccess(item.id, result.recipesUpdated);
    } catch (err: any) {
      setError(err.message ?? 'Unbekannter Fehler.');
    } finally {
      setSaving(false);
    }
  }

  const highDuplicate = duplicates.find(d => d.similarity_score >= 0.7);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-(--surface) border border-(--border-hover) rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-(--border) shrink-0">
          <div>
            <h2 className="text-lg font-bold text-(--text-primary)">Zutat zusammenführen</h2>
            <p className="text-sm text-(--text-muted) mt-0.5 font-mono">„{item.raw_name}"</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-(--surface-hover) text-(--text-muted) transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-(--border) shrink-0">
          <button
            onClick={() => setTab('link_existing')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition ${
              tab === 'link_existing'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-(--text-muted) hover:text-(--text-secondary)'
            }`}
          >
            <Link className="w-4 h-4" />
            Vorhandenen verknüpfen
          </button>
          <button
            onClick={() => setTab('create_new')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition ${
              tab === 'create_new'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-(--text-muted) hover:text-(--text-secondary)'
            }`}
          >
            <Plus className="w-4 h-4" />
            Neu anlegen
          </button>
        </div>

        {/* Inhalt */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── Tab A: Link Existing ─────────────────────────────────────── */}
          {tab === 'link_existing' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
                <input
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setSelectedMaster(null); }}
                  placeholder={`${item.type === 'malt' ? 'Malz' : item.type === 'hop' ? 'Hopfen' : 'Hefe'} suchen...`}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              {searching && (
                <p className="text-xs text-(--text-muted) animate-pulse">Suche...</p>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-1.5">
                  {searchResults.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedMaster(r)}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition ${
                        selectedMaster?.id === r.id
                          ? 'bg-cyan-500/10 border-cyan-500 text-(--text-primary)'
                          : 'border-(--border) text-(--text-secondary) hover:bg-(--surface-hover) hover:text-(--text-primary)'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{r.name}</span>
                        {selectedMaster?.id === r.id && <CheckCircle className="w-4 h-4 text-cyan-400" />}
                      </div>
                      {r.aliases.length > 0 && (
                        <p className="text-xs text-(--text-muted) mt-0.5 truncate">{r.aliases.slice(0, 4).join(' · ')}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {selectedMaster && (
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="checkbox"
                    id="add-product"
                    checked={addProduct}
                    onChange={e => setAddProduct(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="add-product" className="text-sm text-(--text-secondary) cursor-pointer">
                    Auch als neues Produkt bei „{selectedMaster.name}" anlegen
                  </label>
                </div>
              )}
            </div>
          )}

          {/* ── Tab B: Create New ─────────────────────────────────────────── */}
          {tab === 'create_new' && (
            <div className="space-y-4">
              {highDuplicate && (
                <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-300">Mögliches Duplikat gefunden</p>
                    <p className="text-xs text-(--text-muted) mt-0.5">
                      „{highDuplicate.master_name}" ({Math.round(highDuplicate.similarity_score * 100)}% Übereinstimmung)
                      {highDuplicate.manufacturer && ` · ${highDuplicate.manufacturer}`}
                    </p>
                    <p className="text-xs text-amber-400 mt-1">Bitte prüfen ob du lieber „Vorhandenen verknüpfen" nutzen solltest.</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-(--text-muted) uppercase tracking-wider mb-1.5">Name *</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition"
                />
                {checkingDuplicates && <p className="text-xs text-(--text-muted) mt-1 animate-pulse">Prüfe auf Duplikate...</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-(--text-muted) uppercase tracking-wider mb-1.5">Aliasse</label>
                <div className="flex gap-2 mb-2">
                  <input
                    value={newAliasInput}
                    onChange={e => setNewAliasInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAlias())}
                    placeholder="Alias eingeben + Enter"
                    className="flex-1 px-4 py-2 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition"
                  />
                  <button onClick={addAlias} className="px-3 py-2 bg-(--surface-hover) border border-(--border) rounded-xl text-sm text-(--text-secondary) hover:text-(--text-primary) transition">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {newAliases.map(alias => (
                    <span key={alias} className="inline-flex items-center gap-1 px-2.5 py-1 bg-(--surface-sunken) border border-(--border) rounded-lg text-xs text-(--text-secondary)">
                      {alias}
                      <button onClick={() => removeAlias(alias)} className="hover:text-red-400 transition">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Produkt-Formular (shared) ──────────────────────────────────── */}
          {(tab === 'create_new' || addProduct) && (
            <div className="space-y-3 pt-2 border-t border-(--border)">
              <p className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
                Produkt-Details {tab === 'link_existing' ? '(optional)' : '(empfohlen)'}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-(--text-muted) mb-1">Produktname</label>
                  <input
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                    placeholder={item.raw_name}
                    className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-(--text-muted) mb-1">Hersteller</label>
                  <input
                    value={manufacturer}
                    onChange={e => setManufacturer(e.target.value)}
                    placeholder="z.B. Weyermann"
                    className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {(item.type === 'malt') && (
                  <>
                    <div>
                      <label className="block text-xs text-(--text-muted) mb-1">Farbe (EBC)</label>
                      <input type="number" value={colorEbc} onChange={e => setColorEbc(e.target.value)} placeholder="z.B. 4.5" className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition" />
                    </div>
                    <div>
                      <label className="block text-xs text-(--text-muted) mb-1">Potential (Pts)</label>
                      <input type="number" value={potentialPts} onChange={e => setPotentialPts(e.target.value)} placeholder="z.B. 36" className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition" />
                    </div>
                  </>
                )}
                {item.type === 'hop' && (
                  <div>
                    <label className="block text-xs text-(--text-muted) mb-1">Alpha (%)</label>
                    <input type="number" value={alphaPct} onChange={e => setAlphaPct(e.target.value)} placeholder="z.B. 13.5" className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition" />
                  </div>
                )}
                {item.type === 'yeast' && (
                  <div>
                    <label className="block text-xs text-(--text-muted) mb-1">Vergärung (%)</label>
                    <input type="number" value={attenuationPct} onChange={e => setAttenuationPct(e.target.value)} placeholder="z.B. 75" className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-(--text-muted) mb-1">Notizen</label>
                <input
                  value={productNotes}
                  onChange={e => setProductNotes(e.target.value)}
                  placeholder="Optionale Anmerkungen..."
                  className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
            </div>
          )}

          {/* Fehler */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-(--border) shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl border border-(--border-hover) text-(--text-secondary) hover:bg-(--surface-hover) transition text-sm font-medium disabled:opacity-40"
          >
            Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || (tab === 'link_existing' && !selectedMaster)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 hover:bg-emerald-900/30 font-semibold text-sm flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Zusammenführen
          </button>
        </div>
      </div>
    </div>
  );
}
