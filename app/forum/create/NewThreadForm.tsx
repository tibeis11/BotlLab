'use client';

import { useActionState, useState, useRef } from 'react';
import { createThread } from '@/lib/actions/forum-actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Beaker } from 'lucide-react';
import CustomSelect from '@/app/components/CustomSelect';
import MarkdownToolbar from '@/app/forum/_components/MarkdownToolbar';
import PollCreator from './PollCreator';

const AVAILABLE_TAGS = [
  { label: 'Frage',        color: 'blue'    },
  { label: 'Rezept',       color: 'green'   },
  { label: 'Showcase',     color: 'amber'   },
  { label: 'Equipment',    color: 'purple'  },
  { label: 'Tipp',         color: 'emerald' },
  { label: 'Problem',      color: 'rose'    },
  { label: 'Diskussion',   color: 'zinc'    },
  { label: 'Neuigkeit',    color: 'orange'  },
] as const;

const TAG_STYLES: Record<string, string> = {
  blue:    'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20',
  green:   'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20',
  amber:   'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20',
  purple:  'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20',
  emerald: 'bg-emerald-500/10 border-emerald-500/30 text-success hover:bg-success/20',
  rose:    'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20',
  zinc:    'bg-surface-hover border-border-hover text-text-secondary hover:bg-surface-hover/80',
  orange:  'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20',
};

const TAG_ACTIVE: Record<string, string> = {
  blue:    'ring-2 ring-blue-500/40',
  green:   'ring-2 ring-green-500/40',
  amber:   'ring-2 ring-amber-500/40',
  purple:  'ring-2 ring-purple-500/40',
  emerald: 'ring-2 ring-emerald-500/40',
  rose:    'ring-2 ring-rose-500/40',
  zinc:    'ring-2 ring-text-muted/40',
  orange:  'ring-2 ring-orange-500/40',
};

// Categories passed from server component props ideally, or fetched client side if needed
// Simplest: pass as prop to this client component wrapper
interface NewThreadFormProps {
    categories: Array<{ id: string, title: string, slug: string }>;
    preselectedBrewId?: string;
    initialTitle?: string;
    initialCategoryId?: string;
    linkedBrew?: { id: string, name: string, image_url: string | null } | null;
}

const initialState = {
    message: '',
    error: undefined
}

export default function NewThreadForm({ categories, preselectedBrewId, initialTitle, initialCategoryId, linkedBrew }: NewThreadFormProps) {
    const [state, formAction, isPending] = useActionState(createThread, initialState);
    const [selectedCategory, setSelectedCategory] = useState(initialCategoryId || '');
    const [contentValue, setContentValue] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const contentRef = useRef<HTMLTextAreaElement>(null);

    const categoryOptions = categories.map(c => ({ value: c.id, label: c.title }));

    function toggleTag(tag: string) {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : prev.length < 3 ? [...prev, tag] : prev
        );
    }

    return (
        <form action={formAction} className="max-w-2xl mx-auto space-y-8 bg-surface/20 p-6 md:p-8 rounded-2xl border border-border">
            <div>
                 <Link href="/forum" className="text-sm text-text-muted hover:text-text-primary flex items-center gap-1 mb-6 transition">
                    <ArrowLeft size={16} /> Zurück zum Forum
                </Link>
                <h1 className="text-2xl md:text-3xl font-black text-text-primary mb-1">Neues Thema erstellen</h1>
                <p className="text-sm text-text-secondary">Teile dein Wissen oder stelle eine Frage an die Community.</p>
            </div>

            {linkedBrew && (
                <div className="bg-background border border-border p-4 rounded-xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-surface border border-border overflow-hidden flex-shrink-0">
                         {linkedBrew.image_url ? (
                            <img src={linkedBrew.image_url} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-surface">
                                <Beaker className="w-5 h-5 text-text-disabled" />
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="text-[10px] uppercase font-bold text-success tracking-wider">Verknüpftes Rezept</div>
                        <div className="font-bold text-text-primary">{linkedBrew.name}</div>
                    </div>
                </div>
            )}

            {state.error && (
                <div className="bg-error/10 border border-error/20 text-error p-4 rounded-xl text-sm font-bold">
                    <AlertTriangle className="inline w-3.5 h-3.5 mr-1" />{typeof state.error === 'string' ? state.error : 'Bitte überprüfe deine Eingaben.'}
                </div>
            )}

            <div className="space-y-4">
                {/* Category Selection */}
                <div>
                     <label className="block text-xs font-bold text-text-muted uppercase mb-2">Kategorie</label>
                     <CustomSelect 
                        value={selectedCategory} 
                        onChange={setSelectedCategory} 
                        options={categoryOptions} 
                        placeholder="Wähle eine Kategorie..." 
                     />
                     <input type="hidden" name="categoryId" value={selectedCategory} />
                </div>

                {/* Title */}
                 <div>
                     <label className="block text-xs font-bold text-text-muted uppercase mb-2">Titel</label>
                     <input 
                        type="text" 
                        name="title"
                        required
                        minLength={5}
                        maxLength={100}
                        defaultValue={initialTitle || ""}
                        placeholder="Kurze, aussagekräftige Überschrift..."
                        className="w-full bg-background border border-border rounded-xl p-3 text-text-primary focus:outline-none focus:border-border-active transition placeholder:text-text-disabled font-bold"
                     />
                </div>

                 {/* Content */}
                 <div>
                     <label className="block text-xs font-bold text-text-muted uppercase mb-2">Inhalt</label>
                     <div className="bg-background border border-border rounded-xl overflow-hidden focus-within:border-border-active transition">
                         <MarkdownToolbar textareaRef={contentRef} value={contentValue} onChange={setContentValue} />
                         <textarea 
                            ref={contentRef}
                            name="content"
                            required
                            minLength={10}
                            rows={8}
                            value={contentValue}
                            onChange={(e) => setContentValue(e.target.value)}
                            placeholder="Beschreibe dein Anliegen so genau wie möglich..."
                            className="w-full bg-transparent border-0 p-3 text-text-primary focus:outline-none focus:ring-0 placeholder:text-text-disabled resize-y"
                         />
                     </div>
                </div>

                <input type="hidden" name="brewId" value={preselectedBrewId || ''} />
                <input type="hidden" name="tags"   value={selectedTags.join(',')} />

                {/* Tags */}
                <div>
                    <label className="block text-xs font-bold text-text-muted uppercase mb-2">
                        Tags <span className="normal-case font-normal text-text-disabled">(max. 3 auswählen)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {AVAILABLE_TAGS.map(({ label, color }) => {
                            const active = selectedTags.includes(label);
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => toggleTag(label)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                                        TAG_STYLES[color]
                                    } ${active ? TAG_ACTIVE[color] : 'opacity-60 hover:opacity-100'}`}
                                >
                                    {active && <span className="mr-1">&#10003;</span>}{label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Poll */}
                <PollCreator />

                <div className="pt-4 flex justify-end">
                    <button 
                        type="submit" 
                        disabled={isPending}
                        className="bg-success hover:bg-success/90 text-text-primary px-8 py-3 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
                    >
                        {isPending ? 'Speichert...' : 'Veröffentlichen'}
                    </button>
                </div>
            </div>
        </form>
    );
}
