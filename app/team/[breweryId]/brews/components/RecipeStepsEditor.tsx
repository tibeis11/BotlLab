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
                 <label className="text-xs uppercase font-bold text-text-muted block">Brauanleitung / Schritte</label>
            </div>
            
            <div className="space-y-3">
                {steps.map((step, idx) => (
                    <div key={step.id || idx} className="group transition-all duration-300 bg-background sm:bg-transparent border border-border sm:border-0 rounded-xl sm:rounded-none p-3 sm:p-0">
                        <div className="flex gap-3 items-start">
                            <div className="hidden sm:flex flex-col gap-1 pt-2">
                                 <button 
                                    onClick={() => moveStep(idx, 'up')}
                                    disabled={idx === 0}
                                    className="p-1 bg-surface border border-border hover:bg-surface-hover rounded disabled:opacity-20 text-text-secondary hover:text-text-primary transition-colors"
                                    title="Nach oben verschieben"
                                >
                                    <ChevronUp size={12} />
                                </button>
                                 <button 
                                    onClick={() => moveStep(idx, 'down')}
                                    disabled={idx === steps.length - 1}
                                    className="p-1 bg-surface border border-border hover:bg-surface-hover rounded disabled:opacity-20 text-text-secondary hover:text-text-primary transition-colors"
                                    title="Nach unten verschieben"
                                >
                                    <ChevronDown size={12} />
                                </button>
                            </div>
                            
                            <div className="hidden sm:flex flex-none pt-2">
                                 <div className="w-6 h-6 rounded-full bg-surface-hover border border-border flex items-center justify-center text-xs font-bold text-text-secondary">
                                     {idx + 1}
                                 </div>
                            </div>

                            <div className="flex-1 space-y-2 min-w-0">
                                {/* Mobile Header */}
                                <div className="flex items-center gap-2 sm:hidden mb-1">
                                    <div className="w-6 h-6 rounded-full bg-surface-hover border border-border flex items-center justify-center text-xs font-bold text-text-secondary shrink-0">
                                        {idx + 1}
                                    </div>
                                    <input
                                        value={step.title || ''}
                                        onChange={(e) => updateStep(idx, 'title', e.target.value)}
                                        className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-text-primary font-bold placeholder:text-text-disabled focus:border-brand outline-none text-sm min-w-0"
                                        placeholder="Titel..."
                                    />
                                    <button 
                                        onClick={() => removeStep(idx)}
                                        className="p-1.5 text-text-muted hover:text-red-500 bg-surface border border-border rounded-lg"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {/* Desktop Title */}
                                <input
                                    value={step.title || ''}
                                    onChange={(e) => updateStep(idx, 'title', e.target.value)}
                                    className="hidden sm:block w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary font-bold placeholder:text-text-disabled focus:border-brand focus:ring-2 focus:ring-brand/20 transition outline-none text-sm"
                                    placeholder="Titel (optional, z.B. Einmaischen)"
                                />
                                <AutoResizingTextarea
                                    value={step.instruction}
                                    onChange={(e) => updateStep(idx, 'instruction', e.target.value)}
                                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary focus:border-brand focus:ring-2 focus:ring-brand/20 transition outline-none placeholder:text-text-disabled min-h-[80px] text-sm font-mono"
                                    placeholder="Beschreibe diesen Schritt... (Markdown wird unterstützt: **fett**, *kursiv*)"
                                />
                                
                                {/* Mobile Footer Controls */}
                                <div className="flex items-center justify-end gap-2 sm:hidden">
                                    <button 
                                        onClick={() => moveStep(idx, 'up')}
                                        disabled={idx === 0}
                                        className="p-1.5 bg-surface border border-border rounded-lg text-text-secondary disabled:opacity-30"
                                    >
                                        <ChevronUp size={16} />
                                    </button>
                                    <button 
                                        onClick={() => moveStep(idx, 'down')}
                                        disabled={idx === steps.length - 1}
                                        className="p-1.5 bg-surface border border-border rounded-lg text-text-secondary disabled:opacity-30"
                                    >
                                        <ChevronDown size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2 hidden sm:block">
                                <button 
                                    onClick={() => removeStep(idx)}
                                    className="p-2 text-text-disabled hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
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
                    className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-text-muted hover:text-cyan-400 hover:bg-surface/50 rounded-xl border border-dashed border-border hover:border-cyan-500/30 transition-all group"
                >
                    <span className="group-hover:scale-110 transition-transform text-lg">+</span>
                    <span>Nächsten Schritt hinzufügen</span>
                </button>
            </div>
        </div>
    );
}
