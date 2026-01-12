'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export interface ToastProps {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning';
    link?: string;
    onClose: (id: string) => void;
}

export default function Toast({ id, title, message, type, link, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        // Slide in
        requestAnimationFrame(() => setIsVisible(true));
        
        // Auto remove handled by context usually, but good to have local exit anim trigger
        // We rely on parent calling onClose to remove from state, but we want to animate out first.
        // For simplicity, we just animate IN here. 
        // If the context removes it, it disappears. 
        // Ideally context waits for animation.
    }, []);

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClose(id);
    };

    const content = (
        <div 
            className={`pointer-events-auto bg-zinc-900/90 backdrop-blur border border-zinc-700 p-4 rounded-xl shadow-2xl min-w-[300px] max-w-sm transform transition-all duration-300 hover:bg-zinc-800
            ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
        >
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-white text-sm mb-1">{title}</h4>
                <button 
                    className="text-zinc-500 hover:text-white text-xs p-1" 
                    onClick={handleClose}
                >
                    ✕
                </button>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">{message}</p>
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
