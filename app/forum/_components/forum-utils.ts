/**
 * Strips Markdown syntax from content to produce a clean plain-text preview.
 * Intended for thread-card snippets — not for full rendering.
 */
export function stripMarkdown(text: string): string {
    return text
        // Remove code blocks (fenced + inline)
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`[^`]*`/g, '')
        // Remove ATX headings (# ## ###…)
        .replace(/^#{1,6}\s+/gm, '')
        // Remove bold / italic markers (**text**, *text*, __text__, _text_)
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        // Remove blockquote markers
        .replace(/^>\s?/gm, '')
        // Remove horizontal rules
        .replace(/^[-*_]{3,}\s*$/gm, '')
        // Unwrap markdown links [text](url) → text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove image syntax ![alt](url)
        .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
        // Collapse multiple newlines / whitespace into single space
        .replace(/\n+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

export function formatRelativeTime(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 2)   return 'gerade eben';
    if (diffMins < 60)  return `vor ${diffMins} Min.`;
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    if (diffDays < 7)   return `vor ${diffDays}d`;
    if (diffDays < 30)  return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: '2-digit' });
}
