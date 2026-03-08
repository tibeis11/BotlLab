'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, Sparkles } from 'lucide-react';
import { useUserNotifications, NotificationItem } from '../context/UserNotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import Link from 'next/link';
import { useBotlGuideInsights } from '@/lib/hooks/useBotlGuideInsights';
import { BotlGuideInsightBanner } from './BotlGuideInsight';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useUserNotifications();
  const { insights, dismiss: dismissInsight } = useBotlGuideInsights(3);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const totalBadge = unreadCount + insights.length;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.is_read) {
        await markAsRead(notification.id);
    }
    setIsOpen(false);
  };

  const getNotificationLink = (n: NotificationItem) => {
      if (n.type === 'brew_like') return `/brew/${n.data.brew_id}`;
      // Forum types
      if (n.type === 'forum_reply' || n.type === 'forum_mention') {
          return `/forum/thread/${n.data.thread_id}`;
      }
      if (n.type === 'image_approved' || n.type === 'image_rejected') {
          if (n.data.type === 'brew') return `/brew/${n.data.id}`;
          return `/brewery/${n.data.id}`;
      }
      if (n.type === 'report_resolved') return '#';
      if (n.type === 'content_moderated') {
          if (n.data.is_appeal_response) return '#';
          if (n.data.can_appeal) {
              const params = new URLSearchParams();
              if (n.data.target_type) params.set('type', n.data.target_type);
              if (n.data.target_title) params.set('title', n.data.target_title);
              if (n.data.reason) params.set('reason', n.data.reason);
              if (n.data.report_id) params.set('reportId', n.data.report_id);
              return `/appeal?${params.toString()}`;
          }
          return '/terms';
      }
      return '#';
  };

  const renderNotificationContent = (n: NotificationItem) => {
      switch (n.type) {
          case 'brew_like':
              return (
                  <span>
                      <span className="font-bold text-text-primary">{n.actor?.display_name || 'Jemand'}</span> gefällt dein Rezept <span className="text-brand">"{n.data.brew_name}"</span>.
                  </span>
              );
          case 'forum_reply':
              return (
                  <span>
                      <span className="font-bold text-text-primary">{n.actor?.display_name || 'Jemand'}</span> hat auf deine Diskussion <span className="text-success">"{n.data.thread_title || 'Unbekannt'}"</span> geantwortet.
                  </span>
              );
          case 'forum_mention':
              return (
                  <span>
                       <span className="font-bold text-text-primary">{n.actor?.display_name || 'Jemand'}</span> hat dich in <span className="text-success">"{n.data.thread_title || 'Unbekannt'}"</span> <span className="text-brand font-bold">erwähnt</span>.
                  </span>
              );
          case 'image_approved':
              return (
                  <span>
                      Dein Bild für <span className="font-bold text-text-primary">{n.data.name}</span> wurde genehmigt und ist jetzt live.
                  </span>
              );
          case 'image_rejected':
              return (
                  <span>
                      Dein Bild für <span className="font-bold text-text-primary">{n.data.name}</span> wurde abgelehnt: <span className="text-accent-orange italic">"{n.data.reason}"</span>.
                  </span>
              );
          case 'report_resolved':
              return (
                  <span>
                      Update zu deiner Meldung: Wir haben den Fall geprüft und Maßnahmen ergriffen. Danke für deine Mithilfe!
                  </span>
              );
          case 'content_moderated':
              if (n.data.is_appeal_response) {
                  const isAccepted = n.data.appeal_decision === 'accepted';
                  return (
                      <span>
                          Dein Widerspruch {n.data.target_title ? <>zu <span className="font-bold text-text-primary">&quot;{n.data.target_title}&quot;</span> </> : ''}wurde <span className={isAccepted ? 'text-success font-bold' : 'text-error font-bold'}>
                              {isAccepted ? 'stattgegeben' : 'abgelehnt'}
                          </span>.{n.data.admin_response ? <> Begründung: <span className="text-text-muted italic">&quot;{n.data.admin_response}&quot;</span></> : ''}
                      </span>
                  );
              }
              return (
                  <span>
                      Dein Inhalt {n.data.target_title ? <><span className="font-bold text-text-primary">&quot;{n.data.target_title}&quot;</span> </> : ''}wurde entfernt. Grund: <span className="text-accent-orange italic">&quot;{n.data.reason_label || 'Verstoß gegen die Nutzungsbedingungen'}&quot;</span>.{n.data.can_appeal ? <> <span className="text-brand font-bold underline">Widerspruch einlegen →</span></> : ' Bei Fragen wende dich an unser Team.'}
                  </span>
              );
          default:
              return <span>Eine neue Benachrichtigung.</span>;
      }
  };

  if (notifications === undefined) return null; // Wait for context

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-text-muted hover:text-text-primary transition rounded-full hover:bg-surface-hover"
        title="Benachrichtigungen"
      >
        <Bell size={20} />
        {totalBadge > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-error text-background text-[10px] font-bold flex items-center justify-center rounded-full shadow-lg border border-background">
            {totalBadge > 9 ? '9+' : totalBadge}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-border-subtle flex items-center justify-between bg-surface-hover/50">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Benachrichtigungen</h3>
            {unreadCount > 0 && (
                <button 
                    onClick={() => markAllAsRead()}
                    className="text-xs text-brand hover:text-brand-hover flex items-center gap-1"
                >
                    <Check size={12} /> Alles gelesen
                </button>
            )}
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto">
            {/* BotlGuide Insights Section */}
            {insights.length > 0 && (
              <div className="p-3 space-y-2 border-b border-border-subtle">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles size={11} className="text-accent-purple" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-accent-purple">BotlGuide</span>
                </div>
                {insights.map(insight => (
                  <BotlGuideInsightBanner
                    key={insight.id}
                    insight={insight}
                    onDismiss={dismissInsight}
                    compact
                  />
                ))}
              </div>
            )}

            {/* Regular notifications */}
            {notifications.length === 0 ? (
                <div className="p-8 text-center text-text-muted text-sm">
                    Keine Benachrichtigungen.
                </div>
            ) : (
                <div className="divide-y divide-border-subtle">
                    {notifications.map((n) => (
                        <div key={n.id} className={`group relative p-4 hover:bg-surface-hover/50 transition ${!n.is_read ? 'bg-brand-bg/30' : ''}`}>
                            <div className="flex gap-3">
                                <div className="mt-1 min-w-[32px]">
                                    {n.actor?.logo_url ? (
                                        <img src={n.actor.logo_url} className="w-8 h-8 rounded-full bg-surface-hover object-cover" alt="" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-xs font-bold text-text-muted">
                                            ?
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <Link 
                                        href={getNotificationLink(n)} 
                                        onClick={() => handleNotificationClick(n)}
                                        className="block text-sm text-text-secondary leading-snug mb-1"
                                    >
                                        {renderNotificationContent(n)}
                                    </Link>
                                    <p className="text-xs text-text-disabled">
                                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: de })}
                                    </p>
                                </div>
                                <button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        deleteNotification(n.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-text-disabled hover:text-error transition p-1"
                                    title="Löschen"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            {!n.is_read && (
                                <div className="absolute right-2 top-2 w-2 h-2 bg-brand rounded-full"></div>
                            )}
                        </div>
                    ))}
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
