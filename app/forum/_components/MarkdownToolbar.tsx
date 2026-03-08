'use client';

import { Bold, Italic, Code, Quote, List, Heading3 } from 'lucide-react';
import type { RefObject } from 'react';

interface MarkdownToolbarProps {
    textareaRef: RefObject<HTMLTextAreaElement | null>;
    value: string;
    onChange: (val: string) => void;
}

type WrapAction  = { type: 'wrap';   before: string; after: string; placeholder: string };
type PrefixAction = { type: 'prefix'; prefix: string };
type ToolAction = WrapAction | PrefixAction;

function applyAction(
    textarea: HTMLTextAreaElement,
    value: string,
    action: ToolAction,
    onChange: (v: string) => void
) {
    const start = textarea.selectionStart;
    const end   = textarea.selectionEnd;
    const selected = value.substring(start, end);

    let newValue: string;
    let newStart: number;
    let newEnd:   number;

    if (action.type === 'wrap') {
        const insert = selected.length > 0 ? selected : action.placeholder;
        newValue = value.substring(0, start) + action.before + insert + action.after + value.substring(end);
        newStart = start + action.before.length;
        newEnd   = newStart + insert.length;
    } else {
        // Prefix every line in the selection (or the current line if nothing selected)
        let lineStart: number;
        let lineEnd: number;
        if (selected.length > 0) {
            lineStart = start;
            lineEnd   = end;
        } else {
            lineStart = value.lastIndexOf('\n', start - 1) + 1;
            const nextNl = value.indexOf('\n', start);
            lineEnd = nextNl === -1 ? value.length : nextNl;
        }
        const segment  = value.substring(lineStart, lineEnd);
        const prefixed = segment.split('\n').map(l => action.prefix + l).join('\n');
        newValue = value.substring(0, lineStart) + prefixed + value.substring(lineEnd);
        newStart = lineStart;
        newEnd   = lineStart + prefixed.length;
    }

    onChange(newValue);
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newStart, newEnd);
    }, 0);
}

const TOOLS: { icon: React.ReactNode; title: string; action: ToolAction }[] = [
    { icon: <Bold size={13} />,    title: 'Fett',       action: { type: 'wrap',   before: '**', after: '**', placeholder: 'fetter Text' } },
    { icon: <Italic size={13} />,  title: 'Kursiv',     action: { type: 'wrap',   before: '*',  after: '*',  placeholder: 'kursiver Text' } },
    { icon: <Code size={13} />,    title: 'Code',       action: { type: 'wrap',   before: '`',  after: '`',  placeholder: 'code' } },
    { icon: <Quote size={13} />,   title: 'Zitat',      action: { type: 'prefix', prefix: '> ' } },
    { icon: <List size={13} />,    title: 'Liste',      action: { type: 'prefix', prefix: '- ' } },
    { icon: <Heading3 size={13} />,title: 'Überschrift',action: { type: 'prefix', prefix: '### ' } },
];

export default function MarkdownToolbar({ textareaRef, value, onChange }: MarkdownToolbarProps) {
    return (
        <div className="flex items-center gap-0.5 border-b border-border px-1 py-0.5">
            {TOOLS.map(({ icon, title, action }, i) => (
                <button
                    key={i}
                    type="button"
                    title={title}
                    onMouseDown={(e) => {
                        e.preventDefault(); // keep textarea focus
                        if (textareaRef.current) {
                            applyAction(textareaRef.current, value, action, onChange);
                        }
                    }}
                    className="p-1.5 text-text-disabled hover:text-text-secondary hover:bg-surface-hover rounded transition"
                >
                    {icon}
                </button>
            ))}
            <span className="ml-auto text-[9px] text-text-disabled uppercase font-bold tracking-wider hidden sm:block pr-1">
                Markdown
            </span>
        </div>
    );
}
