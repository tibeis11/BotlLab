import { useState, useEffect } from 'react';

export interface BrewStep {
    id?: string; // Add temporary ID for UI stability
    instruction: string;
}

interface RecipeStepsEditorProps {
    value: BrewStep[] | undefined;
    onChange: (value: BrewStep[]) => void;
}

export function RecipeStepsEditor({ value, onChange }: RecipeStepsEditorProps) {
    const [steps, setSteps] = useState<BrewStep[]>([]);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        if (initialized) return;
        
        if (Array.isArray(value)) {
            // Add random IDs to existing steps so React can track them properly during reordering
            const stepsWithIds = value.map(s => ({ ...s, id: s.id || Math.random().toString(36).substr(2, 9) }));
            setSteps(stepsWithIds);
        }
        setInitialized(true);
    }, [value, initialized]);

    // Clean up IDs before sending to parent
    const handleChange = (newSteps: BrewStep[]) => {
        setSteps(newSteps);
        // Strip local IDs before saving to keep JSON clean
        onChange(newSteps.map(({ instruction }) => ({ instruction })));
    };

    const updateStep = (index: number, val: string) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], instruction: val };
        handleChange(newSteps);
    };

    const addStep = () => {
        handleChange([...steps, { instruction: '', id: Math.random().toString(36).substr(2, 9) }]);
    };

    const removeStep = (index: number) => {
        const newSteps = steps.filter((_, i) => i !== index);
        handleChange(newSteps);
    };

    const moveStep = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === steps.length - 1) return;
        
        const newSteps = [...steps];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        
        [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
        
        handleChange(newSteps);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                 <label className="text-xs uppercase font-bold text-zinc-500 block">Brauanleitung / Schritte</label>
            </div>
            
            <div className="space-y-3">
                {steps.map((step, idx) => (
                    <div key={step.id || idx} className="flex gap-3 items-start group transition-all duration-300">
                        <div className="flex flex-col gap-1 pt-2">
                             <button 
                                onClick={() => moveStep(idx, 'up')}
                                disabled={idx === 0}
                                className="p-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded disabled:opacity-20 text-zinc-400 hover:text-white transition-colors"
                                title="Nach oben verschieben"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                            </button>
                             <button 
                                onClick={() => moveStep(idx, 'down')}
                                disabled={idx === steps.length - 1}
                                className="p-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded disabled:opacity-20 text-zinc-400 hover:text-white transition-colors"
                                title="Nach unten verschieben"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </button>
                        </div>
                        
                        <div className="flex-none pt-2">
                             <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400">
                                 {idx + 1}
                             </div>
                        </div>

                        <div className="flex-1">
                            <textarea
                                value={step.instruction}
                                onChange={(e) => updateStep(idx, e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-600 min-h-[80px] text-sm resize-y font-mono"
                                placeholder="Beschreibe diesen Schritt... (Markdown wird unterstützt: **fett**, *kursiv*)"
                            />
                        </div>

                        <div className="pt-2">
                            <button 
                                onClick={() => removeStep(idx)}
                                className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                                title="Schritt entfernen"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                    </div>
                ))}

                <button 
                    onClick={addStep}
                    className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-zinc-500 hover:text-cyan-400 hover:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-800 hover:border-cyan-500/30 transition-all group"
                >
                    <span className="group-hover:scale-110 transition-transform text-lg">+</span>
                    <span>Nächsten Schritt hinzufügen</span>
                </button>
            </div>
        </div>
    );
}
