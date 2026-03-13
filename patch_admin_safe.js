const fs = require('fs');

let content = fs.readFileSync('app/admin/views/ScanAnalyticsView.tsx', 'utf-8');

// Also we need the Save button for the first card.
const newCisSaveBlock = `        </div>
        <div className="flex items-center gap-3 pt-3 border-t border-(--border)">
          <button
            onClick={saveCisSettings}
            disabled={cisSaving}
            className="text-sm px-4 py-2 rounded-lg bg-(--brand) text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {cisSaving ? 'Speichern…' : 'Speichern'}
          </button>
          {cisMsg && (
            <span className={\`text-xs \${cisMsg.startsWith('✓') ? 'text-success' : 'text-error'}\`}>
              {cisMsg}
            </span>
          )}
        </div>
      </div>`;

const oldBlock = `          <div className="space-y-4 lg:col-span-2 mt-4">
            <h3 className="text-[10px] font-semibold text-(--text-muted) uppercase tracking-wider pb-1 border-b border-(--border)">
              Plausibility Engine (v2)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {PLAUSIBILITY_SETTINGS.map((field) => (
                <CisSettingRow
                  key={field.key}
                  field={field}
                  value={cisLocalSettings[field.key] as number}
                  onChange={(v) => setCisLocalSettings((s) => ({ ...s, [field.key]: v }))}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-(--border)">
          <button
            onClick={saveCisSettings}
            disabled={cisSaving}
            className="text-sm px-4 py-2 rounded-lg bg-(--brand) text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {cisSaving ? 'Speichern…' : 'Speichern'}
          </button>
          {cisMsg && (
            <span className={\`text-xs \${cisMsg.startsWith('✓') ? 'text-success' : 'text-error'}\`}>
              {cisMsg}
            </span>
          )}
        </div>
      </div>`;

const newBlock = newCisSaveBlock + `

      {/* ── Plausibility Engine Config ────────────────────────────────────── */}
      <div className="bg-(--surface) border border-(--border) rounded-2xl p-6 space-y-5 mt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-(--text-primary) flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />Plausibility Engine (v2)
            </h2>
            <p className="text-[11px] text-(--text-muted) mt-0.5">
              Bot- und Troll-Defense · Soft-Penalties und Shadowbans
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {PLAUSIBILITY_SETTINGS.map((field) => (
            <CisSettingRow
              key={field.key}
              field={field}
              value={cisLocalSettings[field.key] as number}
              onChange={(v) => setCisLocalSettings((s) => ({ ...s, [field.key]: v }))}
            />
          ))}
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-(--border)">
          <button
            onClick={saveCisSettings}
            disabled={cisSaving}
            className="text-sm px-4 py-2 rounded-lg bg-(--brand) text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {cisSaving ? 'Speichern…' : 'Speichern (Beide)'}
          </button>
          {cisMsg && (
            <span className={\`text-xs \${cisMsg.startsWith('✓') ? 'text-success' : 'text-error'}\`}>
              {cisMsg}
            </span>
          )}
        </div>
      </div>`;

if(content.includes('Plausibility Engine (v2)')) {
    content = content.replace(oldBlock, newBlock);
}

if(!content.includes('ShieldAlert')) {
    content = content.replace(/import \{ (.*?) \} from 'lucide-react'/, (match, p1) => {
      // Just add it if it's missing from the import list
      if (!p1.includes('ShieldAlert')) {
         return `import { ShieldAlert, ${p1} } from 'lucide-react'`;
      }
      return match;
    });
}

fs.writeFileSync('app/admin/views/ScanAnalyticsView.tsx', content, 'utf-8');
console.log('Admin view patched.');
