import QRCode from 'qrcode';
import { getSmartLabelConfig, SLOGANS } from './smart-labels-config';
import { loadLogoAsBase64, loadLogoWithTextAsBase64, renderBrandTextAsImage, renderStyledTextAsImage } from './pdf-utils';
import { BRAND } from './brand';
import { BottleData } from './pdf-generator';

/**
 * Renders a single Smart Label to a Data URL (PNG) via HTML Canvas.
 * Matches the style of the PDF generator.
 */
export const renderLabelToDataUrl = async (
    bottle: BottleData, 
    formatId: string, 
    baseUrl: string
): Promise<string> => {
    
    // Scale for high quality (e.g. 300 DPI approx)
    const scale = 5; 
    
    const config = getSmartLabelConfig(formatId);
    
    // Create canvas with label dimensions
    const canvas = document.createElement('canvas');
    const widthPx = config.width * scale; // mm to px scale
    const heightPx = config.height * scale;
    
    canvas.width = widthPx;
    canvas.height = heightPx;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas Context Fail");

    // Background White
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);

    // Draw Background Image if config has one
    if (config.bgImage) {
        try {
            const bgBase64 = await loadLogoAsBase64(config.bgImage);
            if(bgBase64) {
                const bgImg = new Image();
                bgImg.src = bgBase64;
                await new Promise((r, rej) => { 
                    bgImg.onload = r; 
                    bgImg.onerror = rej;
                });
                ctx.drawImage(bgImg, 0, 0, widthPx, heightPx);
            }
        } catch (e) {
            console.warn("Failed to load background image for label render", e);
        }
    }

    // Helpers
    const mmToPx = (mm: number) => mm * scale;
    const safeZonePx = mmToPx(config.safeZone);
    const contentW = widthPx - safeZonePx * 2;
    const contentH = heightPx - safeZonePx * 2;
    const cX = safeZonePx;
    const cY = safeZonePx;

    // --- 1. Header (Logo + Brand) ---
    const logoBase64 = await loadLogoAsBase64();
    const { iconSize, gap, textSize } = BRAND.print;
    const iconSizePx = mmToPx(iconSize);
    const gapPx = mmToPx(gap);

    // Render Brand Text
    const headerImage = await renderBrandTextAsImage([
        { text: "Botl", color: BRAND.colors.textDark },
        { text: "Lab", color: BRAND.colors.primary }
    ], textSize);

    // Determine layout
    // Header Text Height relative to Icon Size
    const headerTextHPx_mm = 5; // Reduced from 6.8 to match smaller icon (6mm)
    const headerTextHPx = mmToPx(headerTextHPx_mm);
    const headerTextWPx = headerImage.width * (headerTextHPx / headerImage.height) * (scale / (headerImage.height / headerTextHPx)); // Approx width conversion
    // Actually renderBrandTextAsImage returns logical pixels (already scaled down by 4)
    // We need to draw it scaled by OUR scale (5)
    // The render function returned width/height are "1 scale". 
    // We want to draw it at `headerTextHPx`. 
    // Aspect Ratio is headerImage.width / headerImage.height
    const aspectRatio = headerImage.ratio;
    const drawTextW = headerTextHPx * aspectRatio;

    const totalHeaderW = iconSizePx + gapPx + drawTextW;
    const headerX = cX + (contentW - totalHeaderW) / 2;
    const headerY = cY;

    // Draw Icon
    if (logoBase64 && logoBase64.startsWith('data:image')) {
        const logoImg = new Image();
        logoImg.src = logoBase64;
        await new Promise(r => { logoImg.onload = r; });
        ctx.drawImage(logoImg, headerX, headerY, iconSizePx, iconSizePx);
    }

    // Draw Text
    const textImg = new Image();
    textImg.src = headerImage.dataUrl;
    await new Promise(r => { textImg.onload = r; });
    const textY = headerY + (iconSizePx - headerTextHPx) / 2;
    ctx.drawImage(textImg, headerX + iconSizePx + gapPx, textY, drawTextW, headerTextHPx);


    // --- 2. QR Code ---
    const url = `${baseUrl}/b/${bottle.id}`;
    const qrData = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'H',
        margin: 0,
        width: 1000,
        color: { dark: '#000000', light: '#ffffff' }
    });

    const headerBlockH = mmToPx(12);
    const footerH = mmToPx(18);
    const qrAvailableH = contentH - headerBlockH - footerH - mmToPx(5);
    const qrSizeMm = Math.min(config.width - (config.safeZone * 2), (qrAvailableH / scale), 38);
    
    const qrSizePx = mmToPx(qrSizeMm);
    const qrX = cX + (contentW - qrSizePx) / 2;
    const qrY = cY + headerBlockH + mmToPx(2);

    const qrImg = new Image();
    qrImg.src = qrData;
    await new Promise(r => { qrImg.onload = r; });
    ctx.drawImage(qrImg, qrX, qrY, qrSizePx, qrSizePx);


    // --- 3. Slogan ---
    const slogan = SLOGANS[bottle.bottle_number % SLOGANS.length];
    
    // Dynamic Vertical Centering
    const qrBottom = qrY + qrSizePx;
    // "SCAN FOR CONTENT" will be drawn at footerY - 1.5mm (contentH - 2mm baseline - 1.5mm offset)
    const scanForContentY = cY + contentH - mmToPx(3.5);
    // Account for approximate text height (6pt ≈ 2mm) to get visual top
    const footerVisualTop = scanForContentY - mmToPx(2);
    
    // Use actual geometric center between QR bottom and footer top
    const centerV = qrBottom + (footerVisualTop - qrBottom) / 2;

    // Split text logic for Canvas
    // We don't have jspdf's splitTextToSize here easily without loading a font context
    // But we can use measureText roughly
    ctx.font = `900 ${mmToPx(14 * 0.353)}px ${getComputedStyle(document.body).fontFamily || 'Helvetica'}`; // 14pt approx
    const words = slogan.toUpperCase().split(' ');
    const lines: string[] = [];
    let currentLine = words[0];

    const maxW = contentW - mmToPx(6);

    for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + " " + words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxW) {
             lines.push(currentLine);
             currentLine = words[i];
        } else {
             currentLine = testLine;
        }
    }
    lines.push(currentLine);
    const limitedLines = lines.slice(0, 2);

    // Prepare Lines
    const preparedLines = [];
    for (const line of limitedLines) {
         const lineImgData = await renderStyledTextAsImage(line, BRAND.colors.textDark, 14, {
            fontWeight: '900',
            uppercase: true,
            letterSpacing: 0.05
        });
        const lImg = new Image();
        lImg.src = lineImgData.dataUrl;
        await new Promise(r => { lImg.onload = r; });
        preparedLines.push({ img: lImg });
    }

    // Pre-calculate actual render dimensions (in px) for centering
    const scaleFactor = 1.25;
    const renderInfo = preparedLines.map(l => {
        let drawSW = l.img.width * scaleFactor;
        let drawSH = l.img.height * scaleFactor;
        // Scale down if too wide
        if (drawSW > maxW) {
            const ratio = maxW / drawSW;
            drawSW = maxW;
            drawSH = drawSH * ratio;
        }
        return { drawSW, drawSH };
    });

    // Calculate total height using ACTUAL render heights
    const totalHScaled = renderInfo.reduce((acc, info, idx) => {
         return acc + (idx === 0 ? info.drawSH : info.drawSH * 0.65);
    }, 0);
    
    // Center around calculated available space midpoint
    let currentLineY = centerV - (totalHScaled / 2);

    for (let i = 0; i < preparedLines.length; i++) {
        const p = preparedLines[i];
        const { drawSW, drawSH } = renderInfo[i];
        
        ctx.drawImage(p.img, cX + (contentW - drawSW) / 2, currentLineY, drawSW, drawSH);
        currentLineY += (drawSH * 0.65); 
    }
    
    // --- 4. Footer ---
    // Replaced ID with CTA
    const footerY = cY + contentH - mmToPx(2);
    
    // CTA: SCAN FOR CONTENT
    ctx.font = `bold ${mmToPx(6 * 0.353)}px Helvetica, Arial, sans-serif`; // 6pt bold
    ctx.fillStyle = '#969696';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText("SCAN FOR CONTENT", cX + contentW / 2, footerY - mmToPx(1.5)); 

    ctx.fillStyle = '#000000';
    ctx.font = `400 ${mmToPx(7 * 0.353)}px Helvetica, Arial, sans-serif`; // 7pt approx
    ctx.fillText("botllab.vercel.app", cX + contentW / 2, footerY);

    return canvas.toDataURL('image/png');
};
