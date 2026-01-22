'use client';

import { useActionState, useState } from 'react';
import { createThread } from '@/lib/actions/forum-actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CustomSelect from '@/app/components/CustomSelect';

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

    const categoryOptions = categories.map(c => ({ value: c.id, label: c.title }));

    return (
        <form action={formAction} className="max-w-2xl mx-auto space-y-8 bg-zinc-900/30 p-8 rounded-3xl border border-zinc-800">
            <div>
                 <Link href="/forum" className="text-sm text-zinc-500 hover:text-white flex items-center gap-1 mb-6 transition">
                    <ArrowLeft size={16} /> Zurück
                </Link>
                <h1 className="text-3xl font-black text-white mb-2">Neues Thema erstellen</h1>
                <p className="text-zinc-400">Teile dein Wissen oder stelle eine Frage an die Community.</p>
            </div>

            {linkedBrew && (
                <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden flex-shrink-0">
                         {linkedBrew.image_url ? (
                            <img src={linkedBrew.image_url} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">🍺</div>
                        )}
                    </div>
                    <div>
                        <div className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Verknüpftes Rezept</div>
                        <div className="font-bold text-white">{linkedBrew.name}</div>
                    </div>
                </div>
            )}

            {state.error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm font-bold">
                    ⚠️ {typeof state.error === 'string' ? state.error : 'Bitte überprüfe deine Eingaben.'}
                </div>
            )}

            <div className="space-y-4">
                {/* Category Selection */}
                <div>
                     <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Kategorie</label>
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
                     <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Titel</label>
                     <input 
                        type="text" 
                        name="title"
                        required
                        minLength={5}
                        maxLength={100}
                        defaultValue={initialTitle || ""}
                        placeholder="Kurze, aussagekräftige Überschrift..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-600 transition placeholder:text-zinc-700 font-bold"
                     />
                </div>

                 {/* Content */}
                 <div>
                     <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Inhalt</label>
                     <textarea 
                        name="content"
                        required
                        minLength={10}
                        rows={8}
                        placeholder="Beschreibe dein Anliegen so genau wie möglich..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-600 transition placeholder:text-zinc-700 resize-y"
                     />
                </div>

                <input type="hidden" name="brewId" value={preselectedBrewId || ''} />

                <div className="pt-4 flex justify-end">
                    <button 
                        type="submit" 
                        disabled={isPending}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
                    >
                        {isPending ? 'Speichert...' : 'Veröffentlichen'}
                    </button>
                </div>
            </div>
        </form>
    );
}
