'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Info, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface ToastProps {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning';
    link?: string;
    onClose: (id: string) => void;
}

const typeConfig = {
    info:    { icon: Info,          accent: 'border-l-brand',   iconClass: 'text-brand' },
    success: { icon: CheckCircle2,  accent: 'border-l-success', iconClass: 'text-success' },
    warning: { icon: AlertTriangle, accent: 'border-l-[var(--accent-orange)]', iconClass: 'text-accent-orange' },
};

export default function Toast({ id, title, message, type, link, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setIsVisible(true));
    }, []);

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClose(id);
    };

    const { icon: Icon, accent, iconClass } = typeConfig[type];

    const content = (
        <div
            className={`pointer-events-auto bg-surface/95 backdrop-blur-md border border-border border-l-4 ${accent} p-4 rounded-2xl shadow-xl min-w-[300px] max-w-sm transform transition-all duration-300
            ${ isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0' }`}
        >
            <div className="flex items-start gap-3">
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconClass}`} />
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-text-primary text-sm mb-0.5">{title}</h4>
                    <p className="text-xs text-text-secondary leading-relaxed">{message}</p>
                </div>
                <button
                    className="text-text-muted hover:text-text-primary transition flex-shrink-0"
                    onClick={handleClose}
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );

    if (link) {
        return (
            <Link href={link} onClick={() => onClose(id)}>
                {content}
            </Link>
        );
    }

    return (
        <div onClick={() => onClose(id)}>
            {content}
        </div>
    );
}
