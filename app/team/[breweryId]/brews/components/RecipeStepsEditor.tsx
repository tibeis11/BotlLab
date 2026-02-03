import { useState, useEffect, useRef } from 'react';
import { Trash2, ChevronUp, ChevronDown } from 'lucide-react';

export interface BrewStep {
    id?: string; // Add temporary ID for UI stability
    title?: string;
    instruction: string;
}

interface RecipeStepsEditorProps {
    value: BrewStep[] | undefined;
    onChange: (value: BrewStep[]) => void;
}

function AutoResizingTextarea({ 
    value, 
    onChange, 
    className, 
    placeholder 
}: { 
    value: string; 
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; 
    className?: string; 
    placeholder?: string;
}) {
    const ref = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const textarea = ref.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [value]);

    return (
        <textarea
            ref={ref}
            value={value}
            onChange={onChange}
            className={`${className} resize-none overflow-hidden`}
            placeholder={placeholder}
            rows={1}
        />
    );
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
        onChange(newSteps.map(({ instruction, title }) => ({ instruction, title })));
    };

    const updateStep = (index: number, key: keyof BrewStep, val: string) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], [key]: val };
        handleChange(newSteps);
    };

    const addStep = () => {
        handleChange([...steps, { instruction: '', title: '', id: Math.random().toString(36).substr(2, 9) }]);
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
                    <div key={step.id || idx} className="group transition-all duration-300 bg-zinc-950 sm:bg-transparent border border-zinc-800 sm:border-0 rounded-xl sm:rounded-none p-3 sm:p-0">
                        <div className="flex gap-3 items-start">
                            <div className="hidden sm:flex flex-col gap-1 pt-2">
                                 <button 
                                    onClick={() => moveStep(idx, 'up')}
                                    disabled={idx === 0}
                                    className="p-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded disabled:opacity-20 text-zinc-400 hover:text-white transition-colors"
                                    title="Nach oben verschieben"
                                >
                                    <ChevronUp size={12} />
                                </button>
                                 <button 
                                    onClick={() => moveStep(idx, 'down')}
                                    disabled={idx === steps.length - 1}
                                    className="p-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded disabled:opacity-20 text-zinc-400 hover:text-white transition-colors"
                                    title="Nach unten verschieben"
                                >
                                    <ChevronDown size={12} />
                                </button>
                            </div>
                            
                            <div className="hidden sm:flex flex-none pt-2">
                                 <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400">
                                     {idx + 1}
                                 </div>
                            </div>

                            <div className="flex-1 space-y-2 min-w-0">
                                {/* Mobile Header */}
                                <div className="flex items-center gap-2 sm:hidden mb-1">
                                    <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                                        {idx + 1}
                                    </div>
                                    <input
                                        value={step.title || ''}
                                        onChange={(e) => updateStep(idx, 'title', e.target.value)}
                                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-white font-bold placeholder:text-zinc-600 focus:border-cyan-500 outline-none text-sm min-w-0"
                                        placeholder="Titel..."
                                    />
                                    <button 
                                        onClick={() => removeStep(idx)}
                                        className="p-1.5 text-zinc-500 hover:text-red-500 bg-zinc-900 border border-zinc-800 rounded-lg"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {/* Desktop Title */}
                                <input
                                    value={step.title || ''}
                                    onChange={(e) => updateStep(idx, 'title', e.target.value)}
                                    className="hidden sm:block w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white font-bold placeholder:text-zinc-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition outline-none text-sm"
                                    placeholder="Titel (optional, z.B. Einmaischen)"
                                />
                                <AutoResizingTextarea
                                    value={step.instruction}
                                    onChange={(e) => updateStep(idx, 'instruction', e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-600 min-h-[80px] text-sm font-mono"
                                    placeholder="Beschreibe diesen Schritt... (Markdown wird unterstützt: **fett**, *kursiv*)"
                                />
                                
                                {/* Mobile Footer Controls */}
                                <div className="flex items-center justify-end gap-2 sm:hidden">
                                    <button 
                                        onClick={() => moveStep(idx, 'up')}
                                        disabled={idx === 0}
                                        className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 disabled:opacity-30"
                                    >
                                        <ChevronUp size={16} />
                                    </button>
                                    <button 
                                        onClick={() => moveStep(idx, 'down')}
                                        disabled={idx === steps.length - 1}
                                        className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 disabled:opacity-30"
                                    >
                                        <ChevronDown size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2 hidden sm:block">
                                <button 
                                    onClick={() => removeStep(idx)}
                                    className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                                    title="Schritt entfernen"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
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
