'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useUserNotifications, NotificationItem } from '../context/UserNotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import Link from 'next/link';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useUserNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      // Add other types here
      return '#';
  };

  const renderNotificationContent = (n: NotificationItem) => {
      switch (n.type) {
          case 'brew_like':
              return (
                  <span>
                      <span className="font-bold text-white">{n.actor?.display_name || 'Jemand'}</span> gefällt dein Rezept <span className="text-cyan-400">"{n.data.brew_name}"</span>.
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
        className="relative p-2 text-zinc-400 hover:text-white transition rounded-full hover:bg-zinc-800"
        title="Benachrichtigungen"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-lg border border-black">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/50">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Benachrichtigungen</h3>
            {unreadCount > 0 && (
                <button 
                    onClick={() => markAllAsRead()}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                    <Check size={12} /> Alles gelesen
                </button>
            )}
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">
                    Keine Benachrichtigungen.
                </div>
            ) : (
                <div className="divide-y divide-zinc-900">
                    {notifications.map((n) => (
                        <div key={n.id} className={`group relative p-4 hover:bg-zinc-900/50 transition ${!n.is_read ? 'bg-zinc-900/20' : ''}`}>
                            <div className="flex gap-3">
                                <div className="mt-1 min-w-[32px]">
                                    {n.actor?.logo_url ? (
                                        <img src={n.actor.logo_url} className="w-8 h-8 rounded-full bg-zinc-800 object-cover" alt="" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                                            ?
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <Link 
                                        href={getNotificationLink(n)} 
                                        onClick={() => handleNotificationClick(n)}
                                        className="block text-sm text-zinc-300 leading-snug mb-1"
                                    >
                                        {renderNotificationContent(n)}
                                    </Link>
                                    <p className="text-xs text-zinc-600">
                                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: de })}
                                    </p>
                                </div>
                                <button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        deleteNotification(n.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition p-1"
                                    title="Löschen"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            {!n.is_read && (
                                <div className="absolute right-2 top-2 w-2 h-2 bg-cyan-500 rounded-full"></div>
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
