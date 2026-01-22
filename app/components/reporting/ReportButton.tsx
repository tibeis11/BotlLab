'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import ReportModal from './ReportModal';
import { type ReportTargetType } from '@/lib/actions/content-reporting-actions';

interface ReportButtonProps {
    targetId: string;
    targetType: ReportTargetType;
    className?: string; // Allow custom styling for different contexts
    iconOnly?: boolean;  // Render only Flag icon if true
    label?: string;      // Custom label text
}

export default function ReportButton({ targetId, targetType, className, iconOnly = false, label = 'Melden' }: ReportButtonProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={className || `text-xs text-zinc-500 hover:text-red-400 flex items-center gap-1.5 transition ml-auto`}
                title="Inhalt melden"
            >
                <Flag size={14} />
                {!iconOnly && <span>{label}</span>}
            </button>

            <ReportModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                targetId={targetId}
                targetType={targetType}
            />
        </>
    );
}
