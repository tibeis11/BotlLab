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

    // Use A4 Landscape or Portrait based on config
    const doc = new jsPDF({
        orientation: config.orientation || 'l',
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

    for (let i = 0; i < bottlesWithQr.length; i++) {
        const bottle = bottlesWithQr[i];
        if (!bottle.qrData) {
            console.warn(`Skipping bottle ${i+1}/${bottlesWithQr.length} - no QR code`);
            continue;
        }

        console.log(`Drawing bottle ${i+1}/${bottlesWithQr.length} at col=${col}, row=${row}, page=${pageCount}`);

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

        // Detect if this is the compact 6605 format
        const isCompactFormat = config.id === '6605';

        // 1. Header (Logo + Brand Name) - Scaled down for compact format
        const { iconSize: baseIconSize, gap: baseGap, textSize: baseTextSize } = BRAND.print;
        const iconSize = isCompactFormat ? baseIconSize * 0.7 : baseIconSize; // 70% smaller for compact
        const gap = isCompactFormat ? baseGap * 0.7 : baseGap;
        const textSize = isCompactFormat ? baseTextSize * 0.7 : baseTextSize;
        
        // Calculate layout with Image
        const headerTextH = isCompactFormat ? 3.5 : 5; // Smaller text height for compact
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

        // 2. QR Code (Center) - Optimized for compact format
        // Available height between header and footer
        const headerBlockH = isCompactFormat ? 6 : 12; // Reduced header space for compact
        const footerH = isCompactFormat ? 9 : 18; // Reduced footer space for compact
        const qrPadding = isCompactFormat ? 1 : 5; // Less padding for compact
        const qrAvailableH = contentH - headerBlockH - footerH - qrPadding;
        const maxQrSize = isCompactFormat ? 20 : 38; // Smaller QR for compact format
        const qrSize = Math.min(contentW, qrAvailableH, maxQrSize);
        
        const qrX = cX + (contentW - qrSize) / 2;
        const qrY = cY + headerBlockH + (isCompactFormat ? 0.5 : 2); 

        doc.addImage(bottle.qrData, 'PNG', qrX, qrY, qrSize, qrSize);

        // 3. Slogan (Below QR) - Scaled for compact format
        // Calculate dynamic center between QR bottom and Footer top
        const qrBottom = qrY + qrSize;
        const scanFooterOffset = isCompactFormat ? 2 : 6;
        const scanForContentY = cY + contentH - scanFooterOffset;
        const footerVisualTop = scanForContentY - (isCompactFormat ? 1.5 : 2);
        
        // Use actual geometric center between QR bottom and footer top
        const centerV = qrBottom + (footerVisualTop - qrBottom) / 2;

        const slogan = options.customSlogan || SLOGANS[bottle.bottle_number % SLOGANS.length];
        
        // Calculate available width
        const maxW = contentW - (isCompactFormat ? 3 : 6);

        // Use dummy font to calculate line breaks for the slogan
        const sloganFontSize = isCompactFormat ? 9 : 14; // Slightly smaller for compact to fit multiple lines
        doc.setFontSize(sloganFontSize);
        doc.setFont("helvetica", "bold"); 
        const lines = doc.splitTextToSize(slogan.toUpperCase(), maxW);
        const maxLines = 2; // Always allow up to 2 lines
        const limitedLines = lines.slice(0, maxLines);
        
        // Prepare Line Images
        type PreparedLine = 
           | { type: 'img'; text: string; data: { width: number; height: number; dataUrl: string; ratio: number } }
           | { type: 'text'; text: string };
           
        const preparedLines: PreparedLine[] = [];
        for (const line of limitedLines) {
            try {
                 const lineImg = await renderStyledTextAsImage(line, BRAND.colors.textDark, sloganFontSize, {
                    fontWeight: '900',
                    uppercase: true,
                    letterSpacing: isCompactFormat ? 0.03 : 0.05 // Less letter spacing for compact
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

        // 4. Footer (Bottom) - Compact version for small format
        const footerY = cY + contentH - 2;
        const footerFontSize = isCompactFormat ? 5 : 6; // Smaller footer for compact
        const urlFontSize = isCompactFormat ? 5.5 : 7; // Smaller URL for compact
        
        doc.setFontSize(footerFontSize);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(150, 150, 150);
        const ctaOffset = isCompactFormat ? 2.5 : 4;
        doc.text("SCAN FOR CONTENT", cX + contentW / 2, footerY - ctaOffset, { align: 'center' });

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(urlFontSize);
        const footerText = options.isPremiumBranding && options.breweryName ? options.breweryName : "botllab.vercel.app";
        doc.text(footerText, cX + contentW / 2, footerY, { align: 'center' });


        // Grid Advancement (Landscape grid logic)
        col++;
        if (col >= config.cols) {
            col = 0;
            row++;
            if (row >= config.rows) {
                // Check if this is the last bottle
                const isLast = i === bottlesWithQr.length - 1;
                if (!isLast) {
                    console.log(`Adding new page after bottle ${i+1}`);
                    doc.addPage();
                    pageCount++;
                }
                row = 0; // Reset row for next page (or end of document)
            }
        }
    }

    console.log(`PDF generation complete: ${bottlesWithQr.length} bottles, ${pageCount} pages`);

    return doc;
};
