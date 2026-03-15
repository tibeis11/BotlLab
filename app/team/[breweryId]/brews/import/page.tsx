'use client';

import { use, useState, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, FileJson, AlertCircle, Loader2 } from 'lucide-react';
import BrewEditor from '@/app/team/[breweryId]/brews/components/BrewEditor';
import { importAndMatchRecipe } from '@/lib/actions/recipe-import';
import type { BrewForm } from '@/app/team/[breweryId]/brews/components/BrewEditor';

export default function ImportWizardPage({ params }: { params: Promise<{ breweryId: string }> }) {
    const { breweryId } = use(params);
    const router = useRouter();
    const [importedData, setImportedData] = useState<Partial<BrewForm> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const processFile = async (file: File) => {
        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const result = await importAndMatchRecipe(formData);
            
            if (!result.success || !result.recipe) {
                throw new Error(result.error || 'Fehler beim Analysieren des Rezepts.');
            }

            const recipe = result.recipe;
            
            const malts = recipe.ingredients
                .filter(i => i.type === 'malt')
                .map(i => ({
                    id: crypto.randomUUID(),
                    name: i.match ? i.match.name : i.raw_name,
                    amount: i.amount.toString(),
                    unit: 'kg', 
                    color_ebc: i.match?.color_ebc?.toString() || i.override_color_ebc?.toString() || '',
                    usage: (i.usage || 'mash')
                }));
                
            const hops = recipe.ingredients
                .filter(i => i.type === 'hop')
                .map(i => ({
                    id: crypto.randomUUID(),
                    name: i.match ? i.match.name : i.raw_name,
                    amount: i.amount.toString(),
                    unit: 'g', 
                    alpha: i.match?.alpha_pct?.toString() || i.override_alpha?.toString() || '',
                    time: i.time_minutes?.toString() || '',
                    usage: (i.usage || 'boil')
                }));
                
            const yeasts = recipe.ingredients
                .filter(i => i.type === 'yeast')
                .map(i => ({
                    id: crypto.randomUUID(),
                    name: i.match ? i.match.name : i.raw_name,
                    amount: i.amount.toString(),
                    unit: 'pkg', 
                    attenuation: i.override_attenuation?.toString() || ''
                }));

            const initialBrewData: Partial<BrewForm> = {
                name: recipe.name || 'Importiertes Rezept',
                style: recipe.style_name || '',
                brew_type: 'beer' as const,
                data: {
                    batch_size_liters: recipe.batch_size_liters?.toString() || '',
                    malts: malts,
                    hops: hops,
                    yeast: yeasts
                }
            };

            setImportedData(initialBrewData);
        } catch (err: unknown) {
            console.error('Import error:', err);
            setError((err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err)) || 'Ein unerwarteter Fehler ist aufgetreten.');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await processFile(file);
        e.target.value = '';
    };

    // Drag & Drop Handlers
    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.name.endsWith('.json') || file.name.endsWith('.xml')) {
                await processFile(file);
            } else {
                setError('Bitte lade nur .json oder .xml Dateien hoch.');
            }
        }
    };

    const handleWindowDragOver = (e: DragEvent<HTMLElement>) => {
        e.preventDefault(); 
    };

    const handleWindowDrop = (e: DragEvent<HTMLElement>) => {
        e.preventDefault();
    };


    if (importedData) {
        return (
            <div className="flex flex-col min-h-[calc(100vh-80px)]">
                <div className="bg-rating/10 border-b border-rating/20 px-4 py-3 flex items-center justify-center gap-2 text-sm text-text-primary z-50 sticky top-0 shadow-sm">
                    <AlertCircle className="w-5 h-5 text-rating shrink-0" />
                    <span><strong>Importiertes Rezept:</strong> Bitte überprüfe die extrahierten Daten. Beim Speichern wird der Sud in deiner Datenbank angelegt.</span>
                    <button 
                        onClick={() => setImportedData(null)}
                        className="ml-4 underline text-text-muted hover:text-text-primary font-bold whitespace-nowrap"
                    >
                        Abbrechen
                    </button>
                </div>
                <div className="flex-1">
                    <BrewEditor breweryId={breweryId} initialData={importedData} />
                </div>
            </div>
        );
    }

    return (
        <main 
            className="min-h-[calc(100vh-80px)] p-4 md:p-8 max-w-5xl mx-auto pb-40"
            onDragOver={handleWindowDragOver }
            onDrop={handleWindowDrop }
        >
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push(`/team/${breweryId}/brews`)}
                        className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-text-muted transition-colors group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold font-heading text-text-primary tracking-tight">
                            Rezept Import Wizard
                        </h1>
                        <p className="text-text-muted text-sm mt-1">
                            Importiere fertige Rezepte (BeerJSON, BeerXML). Unbekannte Zutaten werden automatisch markiert.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div 
                    className={`bg-surface border-2 ${isDragging ? 'border-text-primary bg-surface-hover scale-[1.01]' : 'border-dashed border-border'} p-8 rounded-3xl flex flex-col items-center justify-center min-h-[400px] text-center shadow-sm transition-all`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border transition-colors ${isDragging ? 'bg-text-primary border-text-primary' : 'bg-surface-hover border-border'}`}>
                        <Upload className={`w-8 h-8 ${isDragging ? 'text-background' : 'text-text-muted'}`} />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Datei auswählen oder reinziehen</h2>
                    <p className="text-text-muted max-w-md mx-auto mb-8 flex flex-col gap-2">
                        <span>Wir unterstützen <strong>BeerJSON (.json)</strong> und <strong>BeerXML (.xml)</strong>.</span>
                        <span>Unser Ingredient-Engine versucht deine Zutaten direkt mit der BotlLab-Datenbank zu verknüpfen.</span>
                    </p>
                    
                    {error && (
                        <div className="mb-6 p-4 bg-error/10 border border-error/20 text-error rounded-xl max-w-md w-full text-sm flex items-center gap-3 text-left">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                    
                    <div className="flex gap-4 relative">
                        <label className={`px-8 py-4 bg-text-primary text-background font-bold rounded-2xl cursor-pointer hover:bg-text-secondary hover:scale-[1.02] active:scale-95 transition-all inline-flex items-center gap-3 shadow-md ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            <span>{loading ? 'Wird analysiert & gematcht...' : 'Rezept hochladen'}</span>
                            <input 
                                type="file" 
                                className="hidden" 
                                accept=".json,.xml" 
                                onChange={handleFileUpload}
                                disabled={loading}
                            />
                        </label>
                    </div>
                    
                    <div className="mt-8 flex flex-col items-center gap-2 text-sm text-text-disabled">
                        <span className="flex items-center gap-1"><FileJson className="w-4 h-4" /> Unterstützt JSON & XML</span>
                    </div>
                </div>
            </div>
        </main>
    );
}