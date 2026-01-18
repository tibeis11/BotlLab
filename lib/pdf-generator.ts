import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { getSmartLabelConfig, SLOGANS, LABEL_FORMATS } from './smart-labels-config';
import { loadLogoAsBase64, loadLogoWithTextAsBase64, renderBrandTextAsImage, renderStyledTextAsImage } from './pdf-utils';
import { BRAND } from './brand';

export interface BottleData {
  id: string;
  bottle_number: number;
  qrUrl?: string; 
}

export interface GeneratorOptions {
    baseUrl: string;
    useHighResQR?: boolean;
    formatId?: string;
    onProgress?: (current: number, total: number) => void;
    customSlogan?: string;
    customLogo?: string;
    breweryName?: string;
    isPremiumBranding?: boolean;
}

export const generateSmartLabelPDF = async (bottles: BottleData[], options: GeneratorOptions): Promise<jsPDF> => {
    const config = getSmartLabelConfig(options.formatId);
    const logoBase64 = options.customLogo || await loadLogoAsBase64();
    const logoWithTextBase64 = await loadLogoWithTextAsBase64(); // Fallback wenn Canvas fehlschlägt
    
    // Load Background if available
    const bgImageBase64 = config.bgImage ? await loadLogoAsBase64(config.bgImage) : null;

    // Pre-render text image once to save performance
    let sharedHeaderImage: { dataUrl: string; width: number; height: number; ratio: number } | null = null;
    try {
        if (options.isPremiumBranding && options.breweryName) {
            sharedHeaderImage = await renderBrandTextAsImage([
                { text: options.breweryName, color: BRAND.colors.textDark }
            ], BRAND.print.textSize);
        } else {
            sharedHeaderImage = await renderBrandTextAsImage([
                { text: "Botl", color: BRAND.colors.textDark },
                { text: "Lab", color: BRAND.colors.primary }
            ], BRAND.print.textSize);
        }
    } catch (e) {
        console.warn("Pre-render failed", e);
    }

    const safeZone = config.safeZone || 5;

    // Use A4 Landscape
    const doc = new jsPDF({
        orientation: 'l',
        unit: 'mm',
        format: 'a4'
    });

    const totalBottles = bottles.length;
    let processed = 0;

    // Generate QR Codes in Parallel
    const bottlesWithQr = await Promise.all(bottles.map(async (b) => {
        const url = `${options.baseUrl}/b/${b.id}`;
        let qrData: string | null = null;
        try {
            qrData = await QRCode.toDataURL(url, {
                errorCorrectionLevel: 'H',
                margin: 0,
                width: options.useHighResQR ? 1000 : 500,
                color: { dark: '#000000', light: '#ffffff' }
            });
        } catch (e) {
            console.error("QR Generation failed for", b.id);
        }
        
        processed++;
        if(options.onProgress) options.onProgress(processed, totalBottles);

        return { ...b, qrData };
    }));

    let pageCount = 1;
    let col = 0;
    let row = 0;

    doc.setFont("helvetica", "normal");

    for (const bottle of bottlesWithQr) {
        if (!bottle.qrData) continue;

        // Calculate position in Landscape mode
        // x moves right (cols), y moves down (rows)
        const x = config.marginLeft + (col * config.width);
        const y = config.marginTop + (row * config.height);

        // Draw Background First (covering the full label slot)
        if (bgImageBase64) {
            // Check if rotation is needed? 
            // We assume the image provided fits the slot dimensions (w/h)
            // But if the user provided a "Landscape" image (105x57) for a "Portrait" slot (57x105)
            // we should probably rotate it 90 degrees to fit better?
            // However, jspdf addImage with rotation is tricky with x,y coords.
            // Let's rely on standard fit first.
            doc.addImage(bgImageBase64, 'PNG', x, y, config.width, config.height);
        }

        // Define content box (Portrait style inside the slot)

        // Define content box (Portrait style inside the slot)
        const contentW = config.width - (safeZone * 2);
        const contentH = config.height - (safeZone * 2);
        const cX = x + safeZone;
        const cY = y + safeZone;

        // 1. Header (Logo + Brand Name)
        const { iconSize, gap, textSize } = BRAND.print;
        
        // Calculate layout with Image
        const headerTextH = 5; // Reduced from 6.8 to match smaller icon (6mm)
        const headerTextW = sharedHeaderImage ? (sharedHeaderImage.width * (headerTextH / sharedHeaderImage.height)) : 28; 
        
        const totalHeaderW = iconSize + gap + headerTextW;
        const headerX = cX + (contentW - totalHeaderW) / 2; // Center in Landscape Slot
        const headerY = cY;

        // Draw Icon
        if (logoBase64) {
            doc.addImage(logoBase64, 'PNG', headerX, headerY, iconSize, iconSize, undefined, 'FAST');
        }

        // Draw Text Image
        if (sharedHeaderImage) {
            // Vertically center text relative to icon
            const textY = headerY + (iconSize - headerTextH) / 2;
            doc.addImage(sharedHeaderImage.dataUrl, 'PNG', headerX + iconSize + gap, textY, headerTextW, headerTextH, undefined, 'FAST');
        } else if (logoWithTextBase64) {
            // Fallback: Use logo_withName.svg instead of Helvetica
            // Calculate dimensions to fit both icon and text
            const fallbackW = totalHeaderW;
            const fallbackH = iconSize; // Same height as icon
            const fallbackX = headerX;
            const fallbackY = headerY;
            doc.addImage(logoWithTextBase64, 'SVG', fallbackX, fallbackY, fallbackW, fallbackH, undefined, 'FAST');
        }

        // 2. QR Code (Center)
        // Available height between header and footer
        const headerBlockH = 12; // Height reserved for header
        const footerH = 18; // Increased for larger slogan
        const qrAvailableH = contentH - headerBlockH - footerH - 5; // Reduced padding
        const qrSize = Math.min(contentW, qrAvailableH, 38); // Reduced from 42 to 38
        
        const qrX = cX + (contentW - qrSize) / 2;
        const qrY = cY + headerBlockH + 2; 

        doc.addImage(bottle.qrData, 'PNG', qrX, qrY, qrSize, qrSize);

        // 3. Slogan (Below QR)
        // Calculate dynamic center between QR bottom and Footer top
        const qrBottom = qrY + qrSize;
        // "SCAN FOR CONTENT" will be drawn at footerY - 4 (calculated as contentH - 2 - 4 = contentH - 6)
        const scanForContentY = cY + contentH - 6;
        // Account for approximate text height (6pt ≈ 2mm) to get visual top
        const footerVisualTop = scanForContentY - 2;
        
        // Use actual geometric center between QR bottom and footer top
        const centerV = qrBottom + (footerVisualTop - qrBottom) / 2;

        const slogan = options.customSlogan || SLOGANS[bottle.bottle_number % SLOGANS.length];
        
        // Calculate available width
        const maxW = contentW - 6;

        // Use dummy font to calculate line breaks for the slogan
        doc.setFontSize(14); // Target size
        doc.setFont("helvetica", "bold"); 
        const lines = doc.splitTextToSize(slogan.toUpperCase(), maxW);
        const limitedLines = lines.slice(0, 2); // Max 2 lines
        
        // Prepare Line Images
        type PreparedLine = 
           | { type: 'img'; text: string; data: { width: number; height: number; dataUrl: string; ratio: number } }
           | { type: 'text'; text: string };
           
        const preparedLines: PreparedLine[] = [];
        for (const line of limitedLines) {
            try {
                 const lineImg = await renderStyledTextAsImage(line, BRAND.colors.textDark, 14, {
                    fontWeight: '900',
                    uppercase: true,
                    letterSpacing: 0.05
                });
                preparedLines.push({ type: 'img', data: lineImg, text: line });
            } catch (e) {
                preparedLines.push({ type: 'text', text: line });
            }
        }

        // Pre-calculate actual render dimensions (in mm) for centering
        const renderInfo = preparedLines.map(l => {
            if (l.type === 'img') {
                let drawW = l.data.width;
                let drawH = l.data.height;
                // Scale down if too wide
                if (drawW > maxW) {
                    const ratio = maxW / drawW;
                    drawW = maxW;
                    drawH = drawH * ratio;
                }
                return { drawW, drawH };
            } else {
                return { drawW: maxW, drawH: 5 };
            }
        });

        // Calculate total height using ACTUAL render heights
        const totalH = renderInfo.reduce((acc, info, idx) => {
             return acc + (idx === 0 ? info.drawH : info.drawH * 0.65);
        }, 0);

        // Center around the calculated midpoint
        let currentLineY = centerV - (totalH / 2);

        for (let i = 0; i < preparedLines.length; i++) {
            const lineObj = preparedLines[i];
            const { drawW, drawH } = renderInfo[i];
            
            if (lineObj.type === 'img') {
                doc.addImage(lineObj.data.dataUrl, 'PNG', cX + (contentW - drawW) / 2, currentLineY, drawW, drawH);
                currentLineY += drawH * 0.65; 
            } else {
                doc.setTextColor(50, 50, 50);
                doc.text(lineObj.text, cX + contentW / 2, currentLineY + 3.5, { align: 'center' });
                currentLineY += drawH * 0.65;
            }
        }

        // 4. Footer (Bottom)
        // Replaced ID with CTA
        const footerY = cY + contentH - 2;
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold"); // Bold for CTA
        doc.setTextColor(150, 150, 150);
        doc.text("SCAN FOR CONTENT", cX + contentW / 2, footerY - 4, { align: 'center' }); // CTA Text

        doc.setTextColor(0, 0, 0); // Black for URL
        doc.setFontSize(7);
        const footerText = options.isPremiumBranding && options.breweryName ? options.breweryName : "botllab.vercel.app";
        doc.text(footerText, cX + contentW / 2, footerY, { align: 'center' });


        // Grid Advancement (Landscape grid logic)
        col++;
        if (col >= config.cols) {
            col = 0;
            row++;
            if (row >= config.rows) {
                const isLast = bottlesWithQr.indexOf(bottle) === bottlesWithQr.length - 1;
                if (!isLast) {
                    doc.addPage();
                    pageCount++;
                    col = 0;
                    row = 0;
                }
            }
        }
    }

    return doc;
};
