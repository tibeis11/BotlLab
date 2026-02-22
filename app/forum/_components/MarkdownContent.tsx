'use client';

import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import type { Components } from 'react-markdown';
import React, { type ReactNode } from 'react';

/** Processes a raw text string: turns bare URLs into <a> and @names into badges. */
function processTextNode(text: string): ReactNode {
    const tokenRegex = /(https?:\/\/[^\s<>"]+|(?<!\w)@[\w\u00C0-\u017E\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df]+)/g;
    const parts = text.split(tokenRegex);
    if (parts.length === 1) return text;
    return parts.map((part, i) => {
        if (/^https?:\/\//.test(part)) {
            return (
                <a key={i} href={part} target="_blank" rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline break-all">
                    {part}
                </a>
            );
        }
        if (part.startsWith('@') && part.length > 1) {
            return (
                <span key={i} className="font-bold text-blue-400 bg-blue-500/10 px-1 rounded mx-0.5">
                    {part}
                </span>
            );
        }
        return part;
    });
}

/** Recursively processes ReactNode children to linkify text nodes. */
function processChildren(children: ReactNode): ReactNode {
    if (typeof children === 'string') return processTextNode(children);
    if (Array.isArray(children)) {
        return children.map((child, i) =>
            typeof child === 'string'
                ? <React.Fragment key={i}>{processTextNode(child)}</React.Fragment>
                : child
        );
    }
    return children;
}

interface MarkdownContentProps {
    content: string;
    className?: string;
}

export default function MarkdownContent({ content, className }: MarkdownContentProps) {
    const components: Components = {
        p: ({ children }) => (
            <p className="mb-3 last:mb-0 leading-relaxed">
                {processChildren(children as ReactNode)}
            </p>
        ),
        strong: ({ children }) => (
            <strong className="font-bold text-white">{children}</strong>
        ),
        em: ({ children }) => (
            <em className="italic text-zinc-300">{children}</em>
        ),
        h1: ({ children }) => (
            <h1 className="text-xl font-black text-white mt-4 mb-2 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
            <h2 className="text-lg font-bold text-white mt-4 mb-2 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
            <h3 className="text-base font-bold text-zinc-200 mt-3 mb-1 first:mt-0">{children}</h3>
        ),
        pre: ({ children }) => (
            <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-x-auto my-3 text-xs font-mono text-zinc-300">
                {children}
            </pre>
        ),
        code: ({ children }) => (
            <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-[13px] font-mono text-zinc-200">
                {children}
            </code>
        ),
        blockquote: ({ children }) => (
            <div className="flex gap-3 my-3">
                <div className="w-1 rounded-full bg-zinc-700 shrink-0" />
                <div className="text-zinc-400 italic text-sm [&_p]:mb-0">
                    {children}
                </div>
            </div>
        ),
        ul: ({ children }) => (
            <ul className="list-disc list-inside text-zinc-300 space-y-1 my-2 ml-2">
                {children}
            </ul>
        ),
        ol: ({ children }) => (
            <ol className="list-decimal list-inside text-zinc-300 space-y-1 my-2 ml-2">
                {children}
            </ol>
        ),
        li: ({ children }) => (
            <li className="leading-relaxed">{processChildren(children as ReactNode)}</li>
        ),
        a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer"
                className="text-emerald-400 hover:underline break-all">
                {children}
            </a>
        ),
        hr: () => <hr className="border-zinc-800 my-4" />,
    };

    return (
        <div className={`text-zinc-300 text-sm leading-relaxed ${className ?? ''}`}>
            <ReactMarkdown remarkPlugins={[remarkBreaks]} components={components}>
                {content}
            </ReactMarkdown>
        </div>
    );
}
