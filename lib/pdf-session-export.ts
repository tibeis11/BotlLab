import jsPDF from 'jspdf';
import { TimelineEvent } from '@/lib/types/session-log';

interface SessionReportData {
    breweryName: string;
    sessionName: string;
    date: string;
    batchCode: string;
    style: string;
    stats: {
        og: number;
        fg: number;
        abv: number;
        ibu?: number;
    };
    recipe: {
        malts: any[];
        hops: any[];
        yeast: string;
    };
    timeline: TimelineEvent[];
    tastingNote?: any;
}

export const generateSessionPDF = (data: SessionReportData) => {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const contentWidth = pageWidth - (margin * 2);
    let y = 30;

    // COLORS (Slate Palette + Brand Cyan)
    const c = {
        bg: '#f8fafc',
        card: '#ffffff',
        text: '#0f172a',    // slate-900
        textMuted: '#64748b', // slate-500
        textLight: '#94a3b8', // slate-400
        border: '#e2e8f0',   // slate-200
        cyan: '#0891b2',     // cyan-600
        slate100: '#f1f5f9'
    };

    // Helper: Draw Card Background
    const drawCard = (yPos: number, height: number, filled = true) => {
        if(filled) doc.setFillColor(c.card);
        doc.setDrawColor(c.border);
        if(filled) {
            doc.roundedRect(margin, yPos, contentWidth, height, 3, 3, 'FD');
        } else {
             doc.roundedRect(margin, yPos, contentWidth, height, 3, 3, 'S');
        }
    };

    // BACKGROUND
    doc.setFillColor(c.bg);
    doc.rect(0, 0, pageWidth, doc.internal.pageSize.height, 'F');

    // HEADER
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(c.text);
    doc.text(data.sessionName, margin, y);
    y += 8;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(c.textMuted);
    doc.text(`${data.breweryName} • ${data.date}`, margin, y);
    
    // Batch Badge
    const batchText = `BATCH #${data.batchCode}`;
    const batchWidth = doc.getTextWidth(batchText) + 12;
    doc.setFillColor(c.text);
    doc.roundedRect(pageWidth - margin - batchWidth, y - 10, batchWidth, 10, 2, 2, 'F');
    doc.setTextColor('#ffffff');
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(batchText, pageWidth - margin - batchWidth + 6, y - 3.5);

    y += 20;

    // STATS CARD
    const statsHeight = 35;
    drawCard(y, statsHeight);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(c.textMuted);
    
    const colWidth = contentWidth / 4;
    
    // Draw 4 columns
    ['STAMMWÜRZE', 'RESTEXTRAKT', 'ALKOHOL', 'BITTERE (IBU)'].forEach((label, i) => {
        doc.text(label, margin + (i * colWidth) + 10, y + 10);
    });

    // Values
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(c.text);

    // Value 1: OG
    doc.text(`${data.stats.og?.toFixed(3)}`, margin + 10, y + 22);
    // Value 2: FG
    doc.text(`${data.stats.fg?.toFixed(3)}`, margin + colWidth + 10, y + 22);
    // Value 3: ABV (Colored)
    doc.setTextColor(c.cyan);
    doc.text(`${data.stats.abv ? data.stats.abv.toFixed(1) : '-'}%`, margin + (colWidth * 2) + 10, y + 22);
    doc.setTextColor(c.text);
    // Value 4: IBU
    doc.text(`${data.stats.ibu || '-'}`, margin + (colWidth * 3) + 10, y + 22);

    y += statsHeight + 15;

    // INGREDIENTS SECTION title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(c.textLight); // Uppercase label style
    doc.text("REZEPTUR", margin, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(c.text);
    
    // Malts
    if (data.recipe.malts.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Malz & Fermentables", margin, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        data.recipe.malts.forEach(m => {
            const line = `• ${m.amount} kg  ${m.name}`;
            doc.text(line, margin + 5, y);
            y += 6;
        });
        y += 4;
    }

    // Hops
    if (data.recipe.hops.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Hopfen", margin, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        data.recipe.hops.forEach(h => {
             const line = `• ${h.amount} g  ${h.name}  (${h.time} min)`;
            doc.text(line, margin + 5, y);
            y += 6;
        });
        y += 4;
    }

    // Yeast
    if (data.recipe.yeast) {
        doc.setFont("helvetica", "bold");
        doc.text("Hefe", margin, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.text(`• ${data.recipe.yeast}`, margin + 5, y);
        y += 10;
    }
    
    y += 10;

    // LOGS / TIMELINE
    if (y > 220) { doc.addPage(); doc.setFillColor(c.bg); doc.rect(0,0,pageWidth,doc.internal.pageSize.height,'F'); y = 30; }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(c.textLight);
    doc.text("LOGBUCH & MESSUNGEN", margin, y);
    y += 10;
    
    const sortedEvents = [...data.timeline].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    sortedEvents.forEach((event, index) => {
        if (event.type === 'TASTING_NOTE') return; 

        if (y > 260) { doc.addPage(); doc.setFillColor(c.bg); doc.rect(0,0,pageWidth,doc.internal.pageSize.height,'F'); y = 30; }
        
        const timestamp = new Date(event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const dateStr = new Date(event.date).toLocaleDateString([], {day: '2-digit', month: '2-digit'});
        
        // Date Col
        doc.setFont("courier", "normal"); 
        doc.setFontSize(9);
        doc.setTextColor(c.textMuted);
        doc.text(`${dateStr} ${timestamp}`, margin, y);
        
        // Content Col
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(c.text);
        doc.text(event.title || 'Event', margin + 35, y);
        
        // Description
        if (event.description) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(c.textMuted);
            // Wrap text
            const descLines = doc.splitTextToSize(event.description || '', contentWidth - 35);
            doc.text(descLines, margin + 35, y + 5);
            y += (descLines.length * 4) + 2;
        } 
        
        // Measurement Data Highlighting
        if ((event.type === 'MEASUREMENT_OG' || event.type === 'MEASUREMENT_SG' || event.type === 'MEASUREMENT_FG') && (event as any).data) {
             const mData = (event as any).data;
             const val = `> ${mData.gravity?.toFixed(3)} SG  •  ${mData.temperature}°C`;
             doc.setFont("courier", "bold");
             doc.setTextColor(c.cyan);
             doc.text(val, margin + 35, y + (event.description ? 0 : 5));
             doc.setTextColor(c.text);
             y += 5;
        }

        y += 8;
        
        // Divider line except last
        if (index < sortedEvents.length - 1) {
            doc.setDrawColor(c.border);
            doc.line(margin + 35, y - 2, pageWidth - margin, y - 2);
            y += 4;
        }
    });

    // TASTING NOTES
    if (data.tastingNote) {
        doc.addPage();
        doc.setFillColor(c.bg); 
        doc.rect(0,0,pageWidth,doc.internal.pageSize.height,'F');
        y = 30;
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(c.text);
        doc.text("Tasting Report", margin, y);
        y += 15;
        
        drawCard(y, 100); 
        
        const note = data.tastingNote.data;
        
        // Rating
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`Bewertung: ${note.rating} / 5 Sterne`, margin + 10, y + 15);
        y += 10;
        
        // Details
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(c.textMuted);
        
        const details = [
            `Farbe: ${note.srm} SRM`,
            `Klarheit: ${note.clarity}`,
            `Schaum: ${note.head}`,
            `Karbonisierung: ${note.carbonation}`
        ];
        
        let detailY = y + 15;
        details.forEach(d => {
            doc.text(`• ${d}`, margin + 10, detailY);
            detailY += 7;
        });
        
        // Note: Simple display
    }
    
    // FOOTER
    const pageCount = (doc.internal as any).pages.length - 1;
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(c.textLight);
        doc.text(`BotlLab Protocol • ${data.sessionName} • Seite ${i} von ${pageCount}`, margin, doc.internal.pageSize.height - 10);
    }

    // Save
    doc.save(`${data.sessionName.replace(/\s+/g, '_')}_botllab_protocol.pdf`);
};