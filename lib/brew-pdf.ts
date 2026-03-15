/**
 * BotlLab – Rezept-PDF-Exporter
 * Erzeugt ein dark-themed A4-PDF im BotlLab Design System.
 * Verwendet jsPDF (bereits im Projekt vorhanden, v4).
 */
import { jsPDF } from 'jspdf';

// ── Design Tokens (→ globals.css) ────────────────────────────────────────────

const C = {
  bg:          [255, 255, 255] as RGB, // white
  surface:     [248, 250, 252] as RGB, // slate-50
  surface2:    [226, 232, 240] as RGB, // slate-200
  brand:       [6, 182, 212] as RGB,   // cyan-500
  brandBg:     [236, 254, 255] as RGB, // cyan-50
  brandDark:   [8, 145, 178] as RGB,   // cyan-600
  textMain:    [15, 23, 42] as RGB,    // slate-900
  secondary:   [51, 65, 85] as RGB,    // slate-700
  muted:       [71, 85, 105] as RGB,   // slate-600
  disabled:    [100, 116, 139] as RGB, // slate-500
  emerald:     [5, 150, 105] as RGB,   // emerald-600 (darker for print)
  amber:       [217, 119, 6] as RGB,   // amber-600
  red:         [220, 38, 38] as RGB,   // red-600 (darker for print)
  white:       [255, 255, 255] as RGB,
};

type RGB = [number, number, number];

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeNum(val: unknown, fallback = 0): number {
  const n = parseFloat(String(val ?? ''));
  return isNaN(n) ? fallback : n;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function fill(doc: jsPDF, color: RGB) { doc.setFillColor(...color); }
function stroke(doc: jsPDF, color: RGB) { doc.setDrawColor(...color); }
function textColor(doc: jsPDF, color: RGB) { doc.setTextColor(...color); }

function rect(doc: jsPDF, x: number, y: number, w: number, h: number, color: RGB) {
  fill(doc, color);
  doc.rect(x, y, w, h, 'F');
}

function hline(doc: jsPDF, x: number, y: number, w: number, color: RGB, lw = 0.2) {
  stroke(doc, color);
  doc.setLineWidth(lw);
  doc.line(x, y, x + w, y);
}

function label(doc: jsPDF, text: string, x: number, y: number, color: RGB, size: number, bold = false) {
  textColor(doc, color);
  doc.setFontSize(size);
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.text(text, x, y);
}

// Truncate text if wider than maxW mm (approximate at ~0.35mm per char * fontSize/10)
function truncate(text: string, maxChars: number): string {
  return text.length > maxChars ? text.slice(0, maxChars - 1) + '…' : text;
}

// ── Stats Calculations (inline, no heavy imports) ─────────────────────────────

function calcStats(brew: any) {
  const data = brew.data ?? {};
  const malts: any[]  = data.malts  ?? [];
  const hops:  any[]  = data.hops   ?? [];
  const yeasts: any[] = data.yeast  ?? [];

  const batchL    = safeNum(data.batch_size_liters, 20);
  const boilTime  = safeNum(data.boil_time, 60);
  const efficiency = safeNum(data.efficiency, 75) / 100;

  // OG (simplified Morey formula: pts·L/kg)
  const POTENTIAL: Record<string, number> = {
    default: 300, zucker: 384, dextrose: 384, honig: 301,
    extrakt: 350, pilsner: 309, pale: 309, vienna: 300,
    munich: 292, weizen: 309, cara: 275, schokolade: 250, röst: 234,
  };
  function getPotential(name: string): number {
    const n = name.toLowerCase();
    for (const [key, val] of Object.entries(POTENTIAL)) {
      if (key !== 'default' && n.includes(key)) return val;
    }
    return POTENTIAL.default;
  }

  let totalPoints = 0;
  let totalEbcContrib = 0;
  let totalMaltKg = 0;
  for (const m of malts) {
    const kg = m.unit === 'g' ? safeNum(m.amount) / 1000 : safeNum(m.amount);
    totalPoints += kg * getPotential(m.name ?? '') * efficiency;
    totalEbcContrib += kg * safeNum(m.color_ebc, 4);
    totalMaltKg += kg;
  }
  const og = batchL > 0 ? 1 + totalPoints / (batchL * 1000) : 1.050;
  const ebc = totalMaltKg > 0 ? totalEbcContrib / batchL : 0;

  // IBU (simplified Tinseth)
  function bignessFactor(og: number) { return 1.65 * Math.pow(0.000125, og - 1); }
  function boilTimeFactor(t: number) { return (1 - Math.exp(-0.04 * t)) / 4.15; }
  let ibu = 0;
  for (const h of hops) {
    if (h.usage === 'dry_hop') continue;
    const g = h.unit === 'kg' ? safeNum(h.amount) * 1000 : safeNum(h.amount);
    const alpha = safeNum(h.alpha, 5) / 100;
    const t = safeNum(h.time, 0);
    const utilization = bignessFactor(og) * boilTimeFactor(t);
    ibu += (alpha * g * 1000 * utilization) / batchL;
  }

  // ABV estimate
  const attenuation = safeNum(yeasts[0]?.attenuation, 75) / 100;
  const fg = og - (og - 1) * attenuation;
  const abv = (og - fg) * 131.25;

  return {
    og:  og > 1 ? og.toFixed(3)  : '—',
    fg:  fg > 1 ? fg.toFixed(3)  : '—',
    abv: abv > 0 ? abv.toFixed(1) + ' %' : '—',
    ibu: ibu > 0 ? Math.round(ibu).toString() : '—',
    ebc: ebc > 0 ? Math.round(ebc).toString() : '—',
    batch: batchL > 0 ? batchL.toFixed(0) + ' L' : '—',
    efficiency: safeNum(data.efficiency, 0) > 0 ? safeNum(data.efficiency).toFixed(0) + ' %' : '—',
    boilTime: boilTime > 0 ? boilTime.toFixed(0) + ' min' : '—',
  };
}

// ── PDF Builder ───────────────────────────────────────────────────────────────

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function exportBrewPDF(brew: any): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  const currentC = C; // Use base C directly for turquoise brand colors

  const PW = 210; // page width
  const PH = 297; // page height
  const ML = 14;  // margin left
  const MR = 14;  // margin right
  const CW = PW - ML - MR; // content width = 182mm

  const data   = brew.data ?? {};
  const malts: any[]  = data.malts  ?? [];
  const hops:  any[]  = data.hops   ?? [];
  const yeasts: any[] = data.yeast  ?? [];
  const steps: any[]  = data.mash_steps ?? [];
  const mashWater = safeNum(data.mash_water_liters, 0);
  const spargeWater = safeNum(data.sparge_water_liters, 0);
  const stats  = calcStats(brew);

  // ── HEADER BLOCK ─────────────────────────────────────────────────────────
  const HEADER_H = 52;
  rect(doc, 0, 0, PW, HEADER_H, currentC.bg);

  // BotlLab wordmark (top-left)
  try {
    const logoImg = await loadImage('/brand/logo_withName.png');
    const h = 8;
    const w = h * (logoImg.width / logoImg.height);
    doc.addImage(logoImg, 'PNG', ML, 6, w, h);
  } catch (e) {
    // Fallback if image fails to load
    textColor(doc, currentC.textMain);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Botl', ML, 10);
    const botlW = doc.getTextWidth('Botl');
    textColor(doc, currentC.brand);
    doc.text('Lab', ML + botlW, 10);
  }

  // Brew type badge (top-right)
  const typeLabel =
    brew.brew_type === 'wine'      ? 'WEIN' :
    brew.brew_type === 'cider'     ? 'CIDER' :
    brew.brew_type === 'mead'      ? 'MET' :
    brew.brew_type === 'softdrink' ? 'SOFTDRINK' : 'BIER';
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  const typeW = doc.getTextWidth(typeLabel) + 6;
  rect(doc, PW - MR - typeW, 6, typeW, 5.5, currentC.brandBg);
  textColor(doc, currentC.brandDark);
  doc.text(typeLabel, PW - MR - typeW / 2, 9.8, { align: 'center' });

  // Brew name
  const brewName = truncate(brew.name ?? 'Unbekanntes Rezept', 42);
  textColor(doc, currentC.textMain);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(brewName, ML, 28);

  // Style + meta line
  const metaParts = [
    brew.style,
    data.batch_size_liters ? `${safeNum(data.batch_size_liters).toFixed(0)} L` : null,
  ].filter(Boolean).join('  ·  ');
  if (metaParts) {
    textColor(doc, currentC.secondary);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(metaParts, ML, 37);
  }

  // Cyan accent line below brew name area
  rect(doc, ML, 42, 24, 1, currentC.brand);

  // Description/notes teaser (max 1 line)
  const teaser = truncate(brew.description || data.notes || '', 90);
  if (teaser) {
    textColor(doc, currentC.muted);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.text(teaser, ML, 48);
  }

  // ── STATS STRIP ──────────────────────────────────────────────────────────
  const STATS_Y = HEADER_H;
  const STATS_H = 24;
  rect(doc, 0, STATS_Y, PW, STATS_H, currentC.surface);

  const statItems = [
    { label: 'ABV',        value: stats.abv },
    { label: 'IBU',        value: stats.ibu },
    { label: 'EBC',        value: stats.ebc },
    { label: 'OG',         value: stats.og },
    { label: 'Sud',        value: stats.batch },
    { label: 'Ausbeute',   value: stats.efficiency },
    { label: 'Karbonisierung', value: data.carbonation_g_l ? `${safeNum(data.carbonation_g_l).toFixed(1).replace('.', ',')} g/l` : '—' },
  ];

  const tileW = CW / statItems.length;
  statItems.forEach((s, i) => {
    const tx = ML + i * tileW + tileW / 2;

    // Tile separator (except first)
    if (i > 0) {
      stroke(doc, currentC.surface2);
      doc.setLineWidth(0.3);
      doc.line(ML + i * tileW, STATS_Y + 4, ML + i * tileW, STATS_Y + STATS_H - 4);
    }

    // Value
    textColor(doc, currentC.textMain);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(s.value, tx, STATS_Y + 13, { align: 'center' });

    // Label
    textColor(doc, currentC.muted);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(s.label.toUpperCase(), tx, STATS_Y + 19, { align: 'center' });
  });

  // ── CONTENT SECTIONS ─────────────────────────────────────────────────────
  let y = STATS_Y + STATS_H + 6;

  function sectionHeader(title: string) {
    // Cyan left accent bar
    rect(doc, ML, y, 2.5, 4.5, currentC.brand);
    textColor(doc, currentC.textMain);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(title, ML + 5, y + 3.5);
    y += 9;
  }

  function tableRow(
    cols: { text: string; x: number; w: number; align?: 'left' | 'right' | 'center'; color?: RGB }[],
    rowY: number,
    even: boolean,
  ) {
    if (even) rect(doc, ML, rowY - 3.2, CW, 5.2, currentC.surface);
    cols.forEach(col => {
      textColor(doc, col.color ?? currentC.secondary);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const align = col.align ?? 'left';
      const tx = align === 'right' ? col.x + col.w : align === 'center' ? col.x + col.w / 2 : col.x;
      doc.text(truncate(col.text, Math.floor(col.w / 1.8)), tx, rowY, { align });
    });
  }

  function checkNewPage() {
    if (y > PH - 22) {
      doc.addPage();
      rect(doc, 0, 0, PW, PH, currentC.bg);
      y = 14;
    }
  }

  // ── MALZE ────────────────────────────────────────────────────────────────
  if (malts.length > 0) {
    rect(doc, 0, y - 2, PW, malts.length * 5.5 + 14, currentC.bg);
    sectionHeader('MALZE & SCHÜTTUNG');

    // Column header
    textColor(doc, currentC.disabled);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text('NAME',   ML + 5, y);
    doc.text('MENGE',  ML + CW - 15, y, { align: 'right' });
    doc.text('EBC',    ML + CW - 2, y, { align: 'right' });
    y += 2;
    hline(doc, ML, y, CW, currentC.surface2, 0.15);
    y += 3;

    malts.forEach((m, i) => {
      checkNewPage();
      const kg = m.unit === 'g' ? safeNum(m.amount) / 1000 : safeNum(m.amount);
      tableRow([
        { text: m.name ?? '—',                         x: ML + 5,        w: CW - 32 },
        { text: kg.toFixed(3) + ' kg',                 x: ML + CW - 37,  w: 22, align: 'right' },
        { text: m.color_ebc ? `${safeNum(m.color_ebc).toFixed(0)} EBC` : '—', x: ML + CW - 12, w: 10, align: 'right', color: currentC.amber },
      ], y, i % 2 === 0);
      y += 5.5;
    });
    y += 4;
  }

  // ── MAISCHEPLAN ──────────────────────────────────────────────────────────
  if (steps.length > 0 || mashWater > 0 || spargeWater > 0) {
    checkNewPage();
    rect(doc, 0, y - 2, PW, steps.length * 5.5 + (mashWater > 0 || spargeWater > 0 ? 15 : 0) + 14, currentC.bg);
    sectionHeader('MAISCHEPLAN & WASSER');

    if (mashWater > 0 || spargeWater > 0) {
      textColor(doc, currentC.textMain);
      doc.setFontSize(8);
      if (mashWater > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Hauptguss: ', ML + 5, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${mashWater.toFixed(1).replace('.', ',')} L`, ML + 25, y);
      }
      if (spargeWater > 0) {
        doc.setFont('helvetica', 'bold');
        const offset = mashWater > 0 ? 45 : 0;
        doc.text('Nachguss: ', ML + 5 + offset, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${spargeWater.toFixed(1).replace('.', ',')} L`, ML + 25 + offset, y);
      }
      y += 6;
    }

    if (steps.length > 0) {
      textColor(doc, currentC.disabled);
      doc.setFontSize(6.5);
      doc.text('RAST',        ML + 5,       y);
      doc.text('TEMPERATUR',  ML + 115,     y);
      doc.text('DAUER',       ML + CW - 2,  y, { align: 'right' });
      y += 2;
      hline(doc, ML, y, CW, currentC.surface2, 0.15);
      y += 3;

      steps.forEach((s: any, i: number) => {
        checkNewPage();
        const STEP_LABELS: Record<string, string> = {
          rest: '', decoction: ' (Dekoktion)', mashout: ' (Abmaischen)', strike: ' (Einmaischen)',
        };
        const suffix = STEP_LABELS[s.step_type] ?? '';
        tableRow([
          { text: (s.name ?? 'Rast') + suffix,                x: ML + 5,      w: 105 },
          { text: safeNum(s.temperature, 66).toFixed(0) + ' °C', x: ML + 115, w: 30, color: currentC.amber },
          { text: safeNum(s.duration, 60).toFixed(0) + ' min',  x: ML + CW - 20, w: 18, align: 'right' },
        ], y, i % 2 === 0);
        y += 5.5;
      });
    }
    y += 4;
  }

  // ── HOPFEN ───────────────────────────────────────────────────────────────
  if (hops.length > 0) {
    checkNewPage();
    rect(doc, 0, y - 2, PW, hops.length * 5.5 + 14, currentC.bg);
    sectionHeader('HOPFEN');

    textColor(doc, currentC.disabled);
    doc.setFontSize(6.5);
    doc.text('NAME',      ML + 5,       y);
    doc.text('MENGE',     ML + 90,      y);
    doc.text('ALPHA',     ML + 115,     y);
    doc.text('VERWENDUNG', ML + 140,    y);
    doc.text('ZEIT',      ML + CW - 2,  y, { align: 'right' });
    y += 2;
    hline(doc, ML, y, CW, currentC.surface2, 0.15);
    y += 3;

    const HOP_USE_LABEL: Record<string, string> = {
      boil: 'Kochen', dry_hop: 'Dry Hop', whirlpool: 'Whirlpool', mash: 'Maische',
    };

    hops.forEach((h, i) => {
      checkNewPage();
      const g = h.unit === 'kg' ? safeNum(h.amount) * 1000 : safeNum(h.amount);
      const time = safeNum(h.time, 0);
      tableRow([
        { text: h.name ?? '—',                                x: ML + 5,       w: 80 },
        { text: g.toFixed(0) + ' g',                          x: ML + 90,      w: 20 },
        { text: h.alpha ? safeNum(h.alpha).toFixed(1) + ' %' : '—', x: ML + 115, w: 20 },
        { text: HOP_USE_LABEL[h.usage] ?? h.usage ?? '—',    x: ML + 140,     w: 30 },
        { text: time > 0 ? time + ' min' : '—',               x: ML + CW - 20,  w: 18, align: 'right', color: currentC.brandDark },
      ], y, i % 2 === 0);
      y += 5.5;
    });
    y += 4;
  }

  // ── HEFE ─────────────────────────────────────────────────────────────────
  if (yeasts.length > 0) {
    checkNewPage();
    rect(doc, 0, y - 2, PW, yeasts.length * 5.5 + 14, currentC.bg);
    sectionHeader('HEFE');

    textColor(doc, currentC.disabled);
    doc.setFontSize(6.5);
    doc.text('NAME',        ML + 5,       y);
    doc.text('MENGE',       ML + 115,     y);
    doc.text('VERGÄRUNG',   ML + CW - 2,  y, { align: 'right' });
    y += 2;
    hline(doc, ML, y, CW, currentC.surface2, 0.15);
    y += 3;

    yeasts.forEach((yeast, i) => {
      checkNewPage();
      tableRow([
        { text: yeast.name ?? '—',                                           x: ML + 5,      w: 105 },
        { text: safeNum(yeast.amount, 1).toFixed(0) + ' ' + (yeast.unit ?? 'pkg'), x: ML + 115, w: 30 },
        { text: yeast.attenuation ? safeNum(yeast.attenuation).toFixed(0) + ' %' : '—', x: ML + CW - 20, w: 18, align: 'right', color: currentC.emerald },
      ], y, i % 2 === 0);
      y += 5.5;
    });
    y += 4;
  }

  // ── NOTIZEN ───────────────────────────────────────────────────────────────
  const notes = data.notes || brew.description;
  if (notes) {
    checkNewPage();
    sectionHeader('NOTIZEN');
    const lines = doc.splitTextToSize(notes, CW - 5);
    const visibleLines = lines.slice(0, 6); // max 6 lines
    textColor(doc, currentC.secondary);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    visibleLines.forEach((line: string) => {
      doc.text(line, ML + 5, y);
      y += 4.5;
    });
    if (lines.length > 6) {
      textColor(doc, currentC.muted);
      doc.text('…', ML + 5, y);
      y += 4.5;
    }
    y += 2;
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const FOOTER_Y = PH - 10;
  rect(doc, 0, FOOTER_Y - 5, PW, 15, currentC.bg);
  hline(doc, ML, FOOTER_Y - 4, CW, currentC.surface2, 0.3);

  textColor(doc, currentC.textMain);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Botl', ML, FOOTER_Y + 1);
  const footerBotlW = doc.getTextWidth('Botl');
  textColor(doc, currentC.brand);
  doc.text('Lab', ML + footerBotlW, FOOTER_Y + 1);
  const footerFullW = doc.getTextWidth('BotlLab');

  textColor(doc, currentC.muted);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Exportiert am ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}  ·  botllab.de`,
    ML + footerFullW + 3,
    FOOTER_Y + 1,
  );

  // Page number (if multi-page)
  const pages = (doc as any).internal.getNumberOfPages();
  if (pages > 1) {
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      textColor(doc, currentC.disabled);
      doc.setFontSize(7);
      doc.text(`${p} / ${pages}`, PW - MR, FOOTER_Y + 1, { align: 'right' });
    }
  }

  doc.save(`${slugify(brew.name || 'rezept')}.pdf`);
}
