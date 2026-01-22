'use client';

import { useActionState, useRef, useState, useEffect } from 'react';
import { createPost } from '@/lib/actions/forum-actions';
import { MessageSquare, Send, Link as LinkIcon, Loader2, X, Reply } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useThreadInteraction } from './ThreadInteractionContext';

const initialState = {
    message: '',
    success: false,
    error: undefined
}

export default function ReplyInput({ threadId }: { threadId: string }) {
    const [state, formAction, isPending] = useActionState(createPost, initialState);
    const { replyTarget, setReplyTarget } = useThreadInteraction();
    const formRef = useRef<HTMLFormElement>(null);
    const [content, setContent] = useState('');
    const [detectedBrew, setDetectedBrew] = useState<any>(null);
    const [isLoadingBrew, setIsLoadingBrew] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [mentionSuggestion, setMentionSuggestion] = useState<boolean>(false);

    useEffect(() => {
        if (state.success) {
            setContent('');
            setReplyTarget(null);
            formRef.current?.reset();
        }
        // Depend on the state object itself so we trigger even if success stays "true" 
        // (assuming the action returns a fresh object or message changed)
    }, [state]);

    // Handle Reply Target
    useEffect(() => {
        if (replyTarget) {
             setTimeout(() => {
                textareaRef.current?.focus();
             }, 100);
        }
    }, [replyTarget]);

    // Handle Input Change & Autocomplete Logic
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setContent(val);
        
        // Check cursor position for @auto...
        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = val.substring(0, cursorPos);
        const words = textBeforeCursor.split(/\s/);
        const lastWord = words[words.length - 1];

        if (lastWord.startsWith('@')) {
            const query = lastWord.substring(1).toLowerCase(); // remove @
            if ('autor'.startsWith(query) && query.length < 5) {
                setMentionSuggestion(true);
                return;
            }
        }
        setMentionSuggestion(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Submit on Enter (without Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            formRef.current?.requestSubmit();
            return;
        }

        if (e.key === 'Tab' && mentionSuggestion) {
            e.preventDefault();
            const cursorPos = e.currentTarget.selectionStart;
            const textBeforeCursor = content.substring(0, cursorPos);
            const textAfterCursor = content.substring(cursorPos);
            
            const lastSpaceIndex = textBeforeCursor.lastIndexOf(' ');
            const startOfWord = lastSpaceIndex === -1 ? 0 : lastSpaceIndex + 1;
            
            const newText = content.substring(0, startOfWord) + "@Autor " + textAfterCursor;
            setContent(newText);
            setMentionSuggestion(false);
            
            // Need to set cursor position after render, simplified for now
            setTimeout(() => {
                if(textareaRef.current) {
                    textareaRef.current.focus();
                    const newPos = startOfWord + 7; // @Autor + space
                    textareaRef.current.setSelectionRange(newPos, newPos);
                }
            }, 0);
        }
    };

    // Detect Brew Link
    useEffect(() => {
        const brewRegex = /\/brew\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
        const match = content.match(brewRegex);
        
        async function fetchBrew(id: string) {
            setIsLoadingBrew(true);
            const { data } = await supabase
                .from('brews')
                .select('id, name, image_url, moderation_status, brewery:breweries(name)')
                .eq('id', id)
                .single();
            setDetectedBrew(data);
            setIsLoadingBrew(false);
        }

        if (match && match[1]) {
            // Only fetch if it's a new ID
            if (detectedBrew?.id !== match[1]) {
                fetchBrew(match[1]);
            }
        } else {
            setDetectedBrew(null);
        }
    }, [content]);

    return (
        <div className="mt-8 pt-8 border-t border-zinc-800 sticky bottom-0 bg-black pb-6 z-20">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl relative">
                
                {state.error && (
                    <div className="absolute -top-12 left-0 right-0 mx-auto w-fit bg-rose-500/90 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg animate-in fade-in slide-in-from-bottom-2">
                         ⚠️ {typeof state.error === 'string' ? state.error : 'Fehler beim Senden.'}
                    </div>
                )}

                {/* Context Previews (Brew Link & Reply Target) */}
                <div className="flex flex-col md:flex-row gap-2 px-2 pb-2 empty:hidden">
                    {/* Detected Brew Preview */}
                    {(detectedBrew || isLoadingBrew) && (
                        <div className="flex-1 min-w-0 p-2 bg-zinc-950/50 border border-zinc-800 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-1">
                            {isLoadingBrew ? (
                                <>
                                    <Loader2 className="animate-spin text-zinc-500" size={16} />
                                    <span className="text-xs text-zinc-500 font-bold">Lade Rezept-Details...</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-8 h-8 bg-zinc-900 rounded border border-zinc-800 overflow-hidden flex-shrink-0">
                                        {detectedBrew.image_url ? (
                                            <img 
                                                src={detectedBrew.image_url} 
                                                className={`w-full h-full object-cover ${
                                                    (detectedBrew.moderation_status === 'pending' || detectedBrew.moderation_status === 'rejected') && !detectedBrew.image_url.startsWith('/default_label')
                                                    ? 'filter blur-sm opacity-50' 
                                                    : ''
                                                }`} 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs">🍺</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">Erkannt</span>
                                            <span className="text-xs font-bold text-zinc-300 truncate">{detectedBrew.name}</span>
                                        </div>
                                        {detectedBrew.brewery && (
                                            <div className="text-[10px] text-zinc-500 truncate">{detectedBrew.brewery.name}</div>
                                        )}
                                    </div>
                                    <LinkIcon size={14} className="text-zinc-600 mr-2" />
                                </>
                            )}
                        </div>
                    )}

                    {/* Reply Target Indicator */}
                    {replyTarget && (
                        <div className="flex-1 min-w-0 p-2 bg-emerald-950/40 border border-emerald-900/50 rounded-lg flex items-start gap-3 relative animate-in slide-in-from-bottom-2">
                            <div className="p-1 bg-emerald-500/10 rounded text-emerald-500 mt-0.5">
                                <Reply size={12} />
                            </div>
                            <div className="flex-1 min-w-0 pr-6">
                                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5">Antwort auf {replyTarget.authorName}</div>
                                <div className="text-xs text-zinc-400 truncate line-clamp-1 italic opacity-80">
                                    "{(() => {
                                        let cleanPreview = (replyTarget.content || '').trim();
                                        // Remove leading quotes
                                        const quoteRegex = /^((?:> ?[^\n\r]*(?:\r?\n|$))+)/;
                                        const match = cleanPreview.match(quoteRegex);
                                        if (match) {
                                            cleanPreview = cleanPreview.substring(match[0].length).trim();
                                        }
                                        return cleanPreview.substring(0, 100);
                                    })()}"
                                </div>
                            </div>
                            <button 
                                onClick={() => setReplyTarget(null)}
                                className="absolute right-2 top-2 text-zinc-500 hover:text-white p-1 hover:bg-white/10 rounded-full transition"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}
                </div>

                <form ref={formRef} action={(formData) => {
                    // Inject quote if replyTarget exists and it's not already in content
                    if (replyTarget) {
                        // Strip existing quotes from the target content to avoid nesting hell
                        let targetContent = (replyTarget.content || '').trim();
                        const quoteRegex = /^((?:> ?[^\n\r]*(?:\r?\n|$))+)/;
                        const match = targetContent.match(quoteRegex);
                        
                        if (match) {
                            targetContent = targetContent.substring(match[0].length).trim();
                        }

                        // Create clean quote from the actual user content
                        const cleanLine = targetContent.split(/\r?\n/)[0].substring(0, 60);
                        const quote = `> **@${replyTarget.authorName}** schrieb:\n> ${cleanLine}${targetContent.length > 60 ? '...' : ''}\n\n`;
                        
                        if (!content.trim().startsWith('>')) {
                            formData.set('content', quote + content);
                        }
                    }
                    formAction(formData);
                }} className="flex gap-4">
                    <input type="hidden" name="threadId" value={threadId} />
                    
                    <div className="flex-1">
                        <textarea 
                            ref={textareaRef}
                            name="content"
                            placeholder="Schreibe eine Antwort..." 
                            required
                            minLength={2}
                            value={content}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                            className="w-full bg-transparent text-white placeholder:text-zinc-600 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 !outline-none !ring-0 resize-none h-[50px] py-3 pl-2 text-sm"
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={isPending}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white p-3 rounded-xl transition disabled:opacity-50 self-end"
                    >
                         {isPending ? <div className="w-5 h-5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" /> : <Send size={20} />}
                    </button>
                </form>
            </div>
        </div>
    );
}
