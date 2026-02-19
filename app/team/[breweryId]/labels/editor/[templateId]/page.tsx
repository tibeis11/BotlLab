'use client';

import { useEffect, useState, use } from 'react';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { LabelDesign } from '@/lib/types/label-system';
import LabelEditor from '@/app/components/label-editor/LabelEditor';
import { useRouter } from 'next/navigation';
import { getBreweryPremiumStatus } from '@/lib/actions/premium-actions';
import { PremiumStatus } from '@/lib/premium-config';

export default function EditorPage({ params }: { params: Promise<{ breweryId: string; templateId: string }> }) {
    const { breweryId, templateId } = use(params);
    const router = useRouter();
    
    const supabase = useSupabase();

    const [design, setDesign] = useState<LabelDesign | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);

    useEffect(() => {
        loadDesign();
        getBreweryPremiumStatus(breweryId).then(setPremiumStatus);
    }, [templateId, breweryId]);

    async function loadDesign() {
        setLoading(true);
        const { data, error } = await supabase
            .from('label_templates')
            .select('*')
            .eq('id', templateId)
            .single();
        
        if (error || !data) {
            console.error(error);
            setError("Design nicht gefunden.");
        } else {
            // Merge with ID and ensure background layers exist
            const loadedDesign = {
                id: data.id,
                name: data.name,
                ...(data.config as any),
                updatedAt: data.updated_at
            } as LabelDesign;

            // Ensure background shape/image elements exist for older designs
            const elements = Array.isArray(loadedDesign.elements) ? [...loadedDesign.elements] : [];
            const hasBgShape = elements.some(e => e.name === 'Background Color' && e.type === 'shape');
            const hasBgImage = elements.some(e => e.name === 'Background Image' && e.type === 'image');

            if (!hasBgShape) {
                elements.unshift({
                    id: crypto.randomUUID(),
                    type: 'shape',
                    x: 0,
                    y: 0,
                    width: loadedDesign.width,
                    height: loadedDesign.height,
                    rotation: 0,
                    zIndex: 0,
                    content: '',
                    style: { fontFamily: 'Helvetica', fontSize: 0, fontWeight: 'normal', color: '#000000', textAlign: 'left', backgroundColor: loadedDesign.background?.type === 'color' ? loadedDesign.background.value : '#ffffff' },
                    isLocked: true,                    isDeletable: false,                    isVariable: false,
                    name: 'Background Color'
                });
            }

            if (!hasBgImage) {
                elements.splice(1, 0, {
                    id: crypto.randomUUID(),
                    type: 'image',
                    x: 0,
                    y: 0,
                    width: loadedDesign.width,
                    height: loadedDesign.height,
                    rotation: 0,
                    zIndex: 1,
                    content: loadedDesign.background?.type === 'image' ? loadedDesign.background.value : '',
                    style: { fontFamily: 'Helvetica', fontSize: 0, fontWeight: 'normal', color: '#000000', textAlign: 'left' },
                    isLocked: true,
                    isDeletable: false,
                    isVariable: false,
                    name: 'Background Image'
                });
            }

            loadedDesign.elements = elements;

            setDesign(loadedDesign);
        }
        setLoading(false);
    }

    async function handleSave(updatedDesign: LabelDesign) {
        // Strip out non-config fields to avoid duplication in JSON
        const { id, name, updatedAt, createdAt, breweryId: bid, isDefault, ...config } = updatedDesign;
        
        const { error } = await supabase
            .from('label_templates')
            .update({
                name: updatedDesign.name,
                config: config as any,
                updated_at: new Date().toISOString()
            })
            .eq('id', templateId);

        if (error) {
            console.error("Save failed", error);
            alert("Fehler beim Speichern!");
        } else {
            // Optional: Toast message
            console.log("Saved successfully");
        }
    }

    async function handleExit() {
        router.push(`/team/${breweryId}/labels`);
    }

    if (loading) return <div className="h-screen flex items-center justify-center bg-black text-white">Lade Editor...</div>;
    if (error) return <div className="h-screen flex items-center justify-center bg-black text-red-500">{error}</div>;
    if (!design) return null;

    const isSimpleMode = premiumStatus?.tier === 'free' || premiumStatus?.tier === 'brewer';

    return (
        <div className="h-screen w-full bg-zinc-950 text-white overflow-hidden flex flex-col">
            <LabelEditor 
                initialDesign={design} 
                onSave={handleSave} 
                onExit={handleExit}
                isSimpleMode={isSimpleMode}
            />
        </div>
    );
}
