'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import Link from 'next/link';
import { MessageSquare, Send, MessageCircleMore, CornerDownRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getBrewComments, postBrewComment, getBrewDiscussionThreads } from '@/lib/actions/brew-comments-actions';

interface BrewCommentsTabProps {
  brew: any;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  author: {
    id: string;
    display_name: string;
    logo_url: string | null;
    tier: string | null;
  } | null;
}

export default function BrewCommentsTab({ brew }: BrewCommentsTabProps) {
  const [user, setUser] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [commentsResult, discussionsResult] = await Promise.all([
        getBrewComments(brew.id),
        getBrewDiscussionThreads(brew.id),
      ]);
      setComments(commentsResult.comments as Comment[]);
      setDiscussions(discussionsResult);
      setLoading(false);
    }
    load();
  }, [brew.id]);

  function handleReply(comment: Comment) {
    setReplyTo(comment);
    textareaRef.current?.focus();
  }

  function handleSubmit() {
    if (!content.trim() || isPending) return;
    setSubmitError(null);

    startTransition(async () => {
      const result = await postBrewComment(
        brew.id,
        brew.name ?? 'Rezept',
        content,
        replyTo?.id,
      );

      if (result.success) {
        setContent('');
        setReplyTo(null);
        const fresh = await getBrewComments(brew.id);
        setComments(fresh.comments as Comment[]);
      } else {
        setSubmitError(result.error ?? 'Fehler beim Senden');
      }
    });
  }

  const rootComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex gap-10 items-start">

      {/* ── Left: Kommentare ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-10">

      {/* ── Eingabe ─────────────────────────────────────────────── */}
      {user ? (
        <div className="space-y-3">
          {replyTo && (
            <div className="flex items-center gap-2 text-xs text-text-muted bg-surface/40 rounded-lg px-3 py-2 border border-border">
              <CornerDownRight size={12} className="shrink-0 text-text-disabled" />
              <span>
                Antworte auf{' '}
                <span className="text-text-secondary font-semibold">
                  {replyTo.author?.display_name ?? 'Nutzer'}
                </span>
              </span>
              <button
                onClick={() => setReplyTo(null)}
                className="ml-auto text-text-disabled hover:text-text-secondary leading-none"
                aria-label="Antwort abbrechen"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-surface-hover border border-border-hover flex items-center justify-center text-xs font-black text-text-secondary shrink-0 mt-1">
              {(user.user_metadata?.display_name || user.email || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 space-y-2">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
                }}
                rows={3}
                maxLength={1000}
                placeholder={replyTo ? 'Deine Antwort...' : 'Schreib einen Kommentar...'}
                className="w-full bg-surface/60 border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-disabled resize-none focus:outline-none focus:border-border-active transition"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-disabled tabular-nums">{content.length}/1000</span>
                <button
                  onClick={handleSubmit}
                  disabled={!content.trim() || isPending}
                  className="flex items-center gap-2 bg-brand hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs px-4 py-2 rounded-xl transition"
                >
                  <Send size={12} />
                  {isPending ? 'Wird gesendet...' : 'Senden'}
                </button>
              </div>
              {submitError && (
                <p className="text-xs text-red-400">{submitError}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface/40 border border-border rounded-xl p-6 text-center space-y-3">
          <MessageSquare className="w-8 h-8 text-text-disabled mx-auto" />
          <p className="text-text-primary font-bold text-sm">Einloggen um zu kommentieren</p>
          <p className="text-text-disabled text-xs">Teile deine Erfahrungen mit diesem Rezept mit der Community.</p>
          <Link
            href={`/login?next=/brew/${brew.id}?tab=kommentare`}
            className="inline-block mt-2 bg-surface-hover hover:bg-border/30 text-text-primary font-bold text-xs px-5 py-2.5 rounded-xl transition"
          >
            Einloggen
          </Link>
        </div>
      )}

      {/* ── Kommentarliste ───────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-surface shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-surface rounded w-32" />
                <div className="h-4 bg-surface rounded" />
                <div className="h-4 bg-surface rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : rootComments.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto">
            <MessageCircleMore className="w-5 h-5 text-text-disabled" />
          </div>
          <p className="text-text-muted text-sm font-medium">Noch keine Kommentare</p>
          <p className="text-text-disabled text-xs max-w-xs mx-auto">
            Sei der Erste! Teile deine Erfahrung oder stelle dem Brauer eine Frage.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-disabled">
            {rootComments.length} {rootComments.length === 1 ? 'Kommentar' : 'Kommentare'}
          </h3>
          {rootComments.map(comment => (
            <CommentBlock
              key={comment.id}
              comment={comment}
              replies={getReplies(comment.id)}
              onReply={user ? handleReply : undefined}
            />
          ))}
        </div>
      )}

      {/* ── Forum-Diskussionen (mobile: unten) ──────────────────── */}
      <div className="md:hidden border-t border-border/50 pt-6 space-y-3">
        <DiscussionsSidebar brew={brew} discussions={discussions} rootCommentCount={rootComments.length} />
      </div>

      </div>{/* end left column */}

      {/* ── Right sidebar: Diskussionen ──────────────────────────── */}
      <div className="hidden md:block w-56 lg:w-64 shrink-0 sticky top-20 space-y-4">
        <DiscussionsSidebar brew={brew} discussions={discussions} rootCommentCount={rootComments.length} />
      </div>

      </div>{/* end flex */}
    </div>
  );
}

/* ── Sub-components ── */

function DiscussionsSidebar({
  brew,
  discussions,
  rootCommentCount,
}: {
  brew: any;
  discussions: any[];
  rootCommentCount: number;
}) {
  const createUrl = `/forum/create?brewId=${brew.id}&title=${encodeURIComponent('Diskussion: ' + (brew.name ?? ''))}&categorySlug=rezepte`;

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-disabled">
        Diskussionen im Forum
      </h3>

      {discussions.length > 0 ? (
        <div className="space-y-1.5">
          {discussions.map(thread => (
            <Link
              key={thread.id}
              href={`/forum/thread/${thread.id}`}
              className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl bg-surface/40 border border-border/50 hover:bg-surface/80 hover:border-border-hover transition group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <MessageSquare size={12} className="text-text-disabled shrink-0" />
                <span className="text-xs text-text-secondary group-hover:text-text-primary transition font-medium truncate">
                  {thread.title}
                </span>
              </div>
              <span className="text-[10px] text-text-disabled shrink-0 tabular-nums">
                {thread.reply_count ?? 0}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-xs text-text-disabled">Noch keine Forum-Diskussion zu diesem Rezept.</p>
      )}

      <Link
        href={createUrl}
        className="flex items-center gap-2 text-xs text-text-disabled hover:text-brand transition pt-1"
      >
        <MessageSquare size={12} />
        {discussions.length > 0 ? 'Neue Diskussion starten' : 'Diskussion im Forum starten'}
      </Link>
    </div>
  );
}

function CommentBlock({
  comment,
  replies,
  onReply,
}: {
  comment: Comment;
  replies: Comment[];
  onReply?: (c: Comment) => void;
}) {
  const [showReplies, setShowReplies] = useState(true);

  return (
    <div>
      <CommentRow comment={comment} onReply={onReply} />
      {replies.length > 0 && (
        <div className="ml-11 mt-3 space-y-3 border-l border-border/50 pl-4">
          <button
            onClick={() => setShowReplies(v => !v)}
            className="text-[10px] text-text-disabled hover:text-text-secondary transition font-bold uppercase tracking-wider"
          >
            {showReplies ? '▲ Antworten ausblenden' : `▼ ${replies.length} ${replies.length === 1 ? 'Antwort' : 'Antworten'}`}
          </button>
          {showReplies && replies.map(reply => (
            <CommentRow key={reply.id} comment={reply} onReply={onReply} isReply />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentRow({
  comment,
  onReply,
  isReply = false,
}: {
  comment: Comment;
  onReply?: (c: Comment) => void;
  isReply?: boolean;
}) {
  const authorInitial = (comment.author?.display_name || '?')[0].toUpperCase();
  const date = new Date(comment.created_at).toLocaleDateString('de-DE', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div className={`flex gap-3 group ${isReply ? '' : ''}`}>
      <div className={`${isReply ? 'w-7 h-7' : 'w-8 h-8'} rounded-full bg-surface border border-border flex items-center justify-center font-black text-xs text-text-secondary shrink-0 overflow-hidden`}>
        {comment.author?.logo_url ? (
          <img src={comment.author.logo_url} alt="" className="w-full h-full object-cover" />
        ) : authorInitial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-bold text-text-primary">
            {comment.author?.display_name ?? 'Nutzer'}
          </span>
          <span className="text-[10px] text-text-disabled">{date}</span>
        </div>
        <p className="text-text-secondary text-sm mt-1 leading-relaxed whitespace-pre-line">
          {comment.content}
        </p>
        {onReply && !isReply && (
          <button
            onClick={() => onReply(comment)}
            className="mt-2 text-[10px] font-bold uppercase tracking-wider text-text-disabled hover:text-text-secondary transition opacity-0 group-hover:opacity-100"
          >
            Antworten
          </button>
        )}
      </div>
    </div>
  );
}
