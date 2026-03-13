const fs = require('fs');
const file = 'app/team/[breweryId]/analytics/components/ScanIntentChart.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replacements
content = content.replace(/border-zinc-800\/50/g, 'border-border');
content = content.replace(/bg-zinc-800\/50/g, 'bg-border');
content = content.replace(/bg-zinc-800/g, 'bg-surface-hover');
content = content.replace(/bg-zinc-900/g, 'bg-surface-sunken');
content = content.replace(/text-zinc-500/g, 'text-text-secondary');
content = content.replace(/text-zinc-600/g, 'text-text-disabled');
content = content.replace(/text-white/g, 'text-text-primary');

// Replace specific colors
content = content.replace(/text-violet-500/g, 'text-brand');
content = content.replace(/text-violet-400/g, 'text-brand');
content = content.replace(/text-emerald-500/g, 'text-success');
content = content.replace(/text-emerald-400/g, 'text-success');

fs.writeFileSync(file, content);
