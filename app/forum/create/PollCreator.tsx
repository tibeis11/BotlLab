'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, X, Plus, BarChart2 } from 'lucide-react';

export default function PollCreator() {
    const [open, setOpen] = useState(false);
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [multiple, setMultiple] = useState(false);

    function addOption() {
        if (options.length < 6) setOptions(prev => [...prev, '']);
    }

    function removeOption(i: number) {
        if (options.length <= 2) return;
        setOptions(prev => prev.filter((_, idx) => idx !== i));
    }

    function setOption(i: number, value: string) {
        setOptions(prev => prev.map((o, idx) => idx === i ? value : o));
    }

    const validOptions = options.filter(o => o.trim().length > 0);
    const isPollValid = open && question.trim().length >= 3 && validOptions.length >= 2;

    return (
        <div className="mt-3">
            {/* Hidden inputs for server action */}
            {isPollValid && (
                <>
                    <input type="hidden" name="pollQuestion" value={question.trim()} />
                    <input type="hidden" name="pollOptions" value={validOptions.join('||')} />
                    <input type="hidden" name="pollMultiple" value={String(multiple)} />
                </>
            )}

            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 text-xs font-bold text-text-muted hover:text-success transition"
            >
                <BarChart2 size={13} />
                Umfrage hinzufügen
                {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {open && (
                <div className="mt-3 bg-background/60 border border-border rounded-xl p-4 space-y-3">
                    <div>
                        <label className="text-[10px] uppercase font-bold text-text-muted tracking-wider block mb-1">
                            Frage *
                        </label>
                        <input
                            type="text"
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            placeholder="Worüber soll abgestimmt werden?"
                            maxLength={200}
                            className="w-full bg-surface border border-border-hover rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-success"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
                            Antwortoptionen (min. 2, max. 6)
                        </label>
                        {options.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={opt}
                                    onChange={e => setOption(i, e.target.value)}
                                    placeholder={`Option ${i + 1}`}
                                    maxLength={100}
                                    className="flex-1 bg-surface border border-border-hover rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-success"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeOption(i)}
                                    disabled={options.length <= 2}
                                    className="text-text-disabled hover:text-error transition disabled:opacity-30 p-1"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        {options.length < 6 && (
                            <button
                                type="button"
                                onClick={addOption}
                                className="flex items-center gap-1 text-xs text-text-muted hover:text-success transition"
                            >
                                <Plus size={12} /> Option hinzufügen
                            </button>
                        )}
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-text-secondary">
                        <input
                            type="checkbox"
                            checked={multiple}
                            onChange={e => setMultiple(e.target.checked)}
                            className="accent-success"
                        />
                        Mehrfachauswahl erlauben
                    </label>

                    {!isPollValid && question.trim().length > 0 && (
                        <p className="text-[11px] text-warning">Mindestens 2 ausgefüllte Optionen erforderlich.</p>
                    )}
                </div>
            )}
        </div>
    );
}
