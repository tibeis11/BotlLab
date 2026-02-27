'use client';

import { useActionState, useRef, useState, useEffect, useCallback } from 'react';
import { createPost } from '@/lib/actions/forum-actions';
import { MessageSquare, Send, Link as LinkIcon, Loader2, X, Reply, AlertTriangle, Beaker } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useThreadInteraction } from './ThreadInteractionContext';
import MarkdownToolbar from '@/app/forum/_components/MarkdownToolbar';

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
    // @mention autocomplete state
    const [mentionAnchor, setMentionAnchor] = useState<{ query: string; wordStart: number } | null>(null);
    const [mentionResults, setMentionResults] = useState<{ id: string; display_name: string }[]>([]);
    const [mentionSelectedIdx, setMentionSelectedIdx] = useState(0);
    const mentionDropdownRef = useRef<HTMLDivElement>(null);

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

    // Insert a mention into the textarea at the current @word position
    const insertMention = useCallback((user: { id: string; display_name: string }) => {
        if (!mentionAnchor) return;
        const before = content.substring(0, mentionAnchor.wordStart);
        const after = content.substring(mentionAnchor.wordStart + 1 + mentionAnchor.query.length);
        const newContent = before + '@' + user.display_name + ' ' + after;
        setContent(newContent);
        setMentionAnchor(null);
        setMentionResults([]);
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const pos = mentionAnchor.wordStart + user.display_name.length + 2;
                textareaRef.current.setSelectionRange(pos, pos);
            }
        }, 0);
    }, [content, mentionAnchor]);

    // Debounced profile search when mentionAnchor changes
    useEffect(() => {
        if (!mentionAnchor || mentionAnchor.query.length === 0) {
            setMentionResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            const { data } = await supabase
                .from('profiles')
                .select('id, display_name')
                .ilike('display_name', `%${mentionAnchor.query}%`)
                .limit(6);
            setMentionResults(data ?? []);
            setMentionSelectedIdx(0);
        }, 200);
        return () => clearTimeout(timer);
    }, [mentionAnchor?.query]);

    // Handle Input Change & Autocomplete Logic
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setContent(val);

        // Check if cursor is inside a @word
        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = val.substring(0, cursorPos);
        // Match last @word at or before cursor (stop at whitespace)
        const match = textBeforeCursor.match(/@([\w\u00C0-\u017E\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df]*)$/);
        if (match) {
            const wordStart = textBeforeCursor.length - match[0].length;
            setMentionAnchor({ query: match[1], wordStart });
        } else {
            setMentionAnchor(null);
            setMentionResults([]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Handle mention dropdown navigation first
        if (mentionResults.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionSelectedIdx(i => Math.min(i + 1, mentionResults.length - 1));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionSelectedIdx(i => Math.max(i - 1, 0));
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertMention(mentionResults[mentionSelectedIdx]);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setMentionAnchor(null);
                setMentionResults([]);
                return;
            }
        }

        // Submit on Enter (without Shift) â€” only if no mention dropdown open and not already pending
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isPending) {
                formRef.current?.requestSubmit();
            }
            return;
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
        <div className="sticky bottom-0 z-20 bg-zinc-950/95 backdrop-blur-sm border-t border-zinc-800/50
            px-3 py-2.5
            md:mt-8 md:pt-5 md:pb-6 md:px-0 md:border-zinc-800/50">

            {/* â”€â”€ Mobile: compact reply-target indicator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {replyTarget && (
                <div className="md:hidden flex items-center gap-2 mb-2 px-1">
                    <Reply size={11} className="text-emerald-500 shrink-0" />
                    <span className="text-xs text-zinc-400 truncate">
                        Antwort auf <span className="text-zinc-300 font-medium">{replyTarget.authorName}</span>
                    </span>
                    <button
                        onClick={() => setReplyTarget(null)}
                        className="ml-auto text-zinc-600 hover:text-white transition"
                    >
                        <X size={12} />
                    </button>
                </div>
            )}

            {/* â”€â”€ Desktop card wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="hidden md:block md:border md:border-zinc-800 md:rounded-xl overflow-hidden relative md:bg-zinc-950">

                {/* @Mention Autocomplete Dropdown â€” desktop */}
                {mentionResults.length > 0 && (
                    <div
                        ref={mentionDropdownRef}
                        className="absolute bottom-full mb-2 left-4 right-4 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden z-50"
                    >
                        <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                            Nutzer erwÃ¤hnen
                        </div>
                        {mentionResults.map((user, idx) => (
                            <button
                                key={user.id}
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); insertMention(user); }}
                                className={`w-full text-left px-3 py-2 text-sm transition flex items-center gap-2 ${
                                    idx === mentionSelectedIdx
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : 'text-zinc-300 hover:bg-zinc-800'
                                }`}
                            >
                                <span className="text-zinc-500 text-xs">@</span>
                                <span className="font-medium">{user.display_name}</span>
                            </button>
                        ))}
                    </div>
                )}

                {state.error && (
                    <div className="absolute -top-12 left-0 right-0 mx-auto w-fit bg-rose-500/90 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg animate-in fade-in slide-in-from-bottom-2">
                        <AlertTriangle className="inline w-3 h-3 mr-1" />
                        {typeof state.error === 'string' ? state.error : 'Fehler beim Senden.'}
                    </div>
                )}

                {/* Context Previews â€” desktop only */}
                <div className="flex flex-col gap-2 px-4 pt-3 pb-1 empty:hidden">
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
                                            <img src={detectedBrew.image_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                                <Beaker className="w-3 h-3 text-zinc-600" />
                                            </div>
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

                    {replyTarget && (
                        <div className="flex-1 min-w-0 p-2 bg-emerald-950/40 border border-emerald-900/50 rounded-lg flex items-start gap-3 relative animate-in slide-in-from-bottom-2">
                            <div className="p-1 bg-emerald-500/10 rounded text-emerald-500 mt-0.5">
                                <Reply size={12} />
                            </div>
                            <div className="flex-1 min-w-0 pr-6">
                                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5">Antwort auf {replyTarget.authorName}</div>
                                <div className="text-xs text-zinc-400 truncate line-clamp-1 italic opacity-80">
                                    "{(() => {
                                        let clean = (replyTarget.content || '').trim();
                                        const match = clean.match(/^((?:> ?[^\n\r]*(?:\r?\n|$))+)/);
                                        if (match) clean = clean.substring(match[0].length).trim();
                                        return clean.substring(0, 100);
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

                {/* Desktop form */}
                <form ref={formRef} action={(formData) => {
                    if (replyTarget) formData.set('replyToId', replyTarget.id);
                    formAction(formData);
                }} className="flex flex-col gap-0 px-4 pb-3">
                    <input type="hidden" name="threadId" value={threadId} />
                    <MarkdownToolbar textareaRef={textareaRef} value={content} onChange={setContent} />
                    <div className="flex gap-3 pt-0.5">
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
                                className="w-full bg-transparent text-white placeholder:text-zinc-600 focus:outline-none resize-none min-h-[72px] py-3 text-sm"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-lg transition disabled:opacity-50 self-end"
                        >
                            {isPending ? <div className="w-5 h-5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" /> : <Send size={18} />}
                        </button>
                    </div>
                </form>
            </div>

            {/* â”€â”€ Mobile: messenger-style pill input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="md:hidden relative">
                {/* @Mention Autocomplete â€” mobile */}
                {mentionResults.length > 0 && (
                    <div
                        ref={mentionDropdownRef}
                        className="absolute bottom-full mb-2 left-0 right-0 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden z-50"
                    >
                        {mentionResults.map((user, idx) => (
                            <button
                                key={user.id}
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); insertMention(user); }}
                                className={`w-full text-left px-4 py-2.5 text-sm transition flex items-center gap-2 ${
                                    idx === mentionSelectedIdx ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-300'
                                }`}
                            >
                                <span className="text-zinc-500 text-xs">@</span>
                                <span className="font-medium">{user.display_name}</span>
                            </button>
                        ))}
                    </div>
                )}

                <form ref={formRef} action={(formData) => {
                    if (replyTarget) formData.set('replyToId', replyTarget.id);
                    formAction(formData);
                }} className="flex items-end gap-2">
                    <input type="hidden" name="threadId" value={threadId} />
                    {/* Pill input area */}
                    <div className="flex-1 bg-zinc-800/80 rounded-3xl px-4 py-2.5 min-h-[44px] flex items-center">
                        <textarea
                            ref={textareaRef}
                            name="content"
                            placeholder="Antwort schreiben..."
                            required
                            minLength={2}
                            value={content}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            className="w-full bg-transparent text-white placeholder:text-zinc-500 focus:outline-none resize-none text-sm leading-snug max-h-32"
                            style={{ overflowY: content.includes('\n') || content.length > 80 ? 'auto' : 'hidden' }}
                        />
                    </div>
                    {/* Round send button */}
                    <button
                        type="submit"
                        disabled={isPending || !content.trim()}
                        className="w-10 h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full flex items-center justify-center transition disabled:opacity-40 shrink-0"
                    >
                        {isPending ? <div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" /> : <Send size={16} />}
                    </button>
                </form>
            </div>
        </div>
    );
}

