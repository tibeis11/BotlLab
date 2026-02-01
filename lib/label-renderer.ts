import QRCode from 'qrcode';
import { getSmartLabelConfig, SLOGANS } from './smart-labels-config';
import { loadLogoAsBase64, loadLogoWithTextAsBase64, renderBrandTextAsImage, renderStyledTextAsImage } from './pdf-utils';
import { BRAND } from './brand';
import { BottleData } from './pdf-generator-legacy';

/**
 * Renders a single Smart Label to a Data URL (PNG) via HTML Canvas.
 * Matches the style of the PDF generator.
 */
export const renderLabelToDataUrl = async (
    bottle: BottleData, 
    formatId: string, 
    baseUrl: string,
    options?: { customSlogan?: string; customLogo?: string, breweryName?: string, isPremiumBranding?: boolean }
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

    // Detect compact format
    const isCompactFormat = config.id === '6605';

    // --- 1. Header (Logo + Brand) - Scaled for compact format ---
    const logoBase64 = options?.customLogo || await loadLogoAsBase64();
    const { iconSize: baseIconSize, gap: baseGap, textSize: baseTextSize } = BRAND.print;
    const iconSize = isCompactFormat ? baseIconSize * 0.7 : baseIconSize;
    const gap = isCompactFormat ? baseGap * 0.7 : baseGap;
    const textSize = isCompactFormat ? baseTextSize * 0.7 : baseTextSize;
    const iconSizePx = mmToPx(iconSize);
    const gapPx = mmToPx(gap);

    // Render Brand Text
    const textParts = (options?.isPremiumBranding && options?.breweryName)
        ? [{ text: options.breweryName, color: BRAND.colors.textDark }]
        : [
            { text: "Botl", color: BRAND.colors.textDark },
            { text: "Lab", color: BRAND.colors.primary }
          ];

    const headerImage = await renderBrandTextAsImage(textParts, textSize);

    // Determine layout
    // Header Text Height relative to Icon Size
    const headerTextHPx_mm = isCompactFormat ? 3.5 : 5; // Smaller for compact
    const headerTextHPx = mmToPx(headerTextHPx_mm);
    const headerTextWPx = headerImage.width * (headerTextHPx / headerImage.height) * (scale / (headerImage.height / headerTextHPx));
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


    // --- 2. QR Code - Optimized for compact format ---
    const url = `${baseUrl}/b/${bottle.id}`;
    const qrData = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'H',
        margin: 0,
        width: 1000,
        color: { dark: '#000000', light: '#ffffff' }
    });

    const headerBlockH = mmToPx(isCompactFormat ? 8 : 12);
    const footerH = mmToPx(isCompactFormat ? 12 : 18);
    const qrPadding = mmToPx(isCompactFormat ? 2 : 5);
    const qrAvailableH = contentH - headerBlockH - footerH - qrPadding;
    const maxQrSize = isCompactFormat ? 28 : 38;
    const qrSizeMm = Math.min(config.width - (config.safeZone * 2), (qrAvailableH / scale), maxQrSize);
    
    const qrSizePx = mmToPx(qrSizeMm);
    const qrX = cX + (contentW - qrSizePx) / 2;
    const qrY = cY + headerBlockH + mmToPx(isCompactFormat ? 1 : 2);

    const qrImg = new Image();
    qrImg.src = qrData;
    await new Promise(r => { qrImg.onload = r; });
    ctx.drawImage(qrImg, qrX, qrY, qrSizePx, qrSizePx);


    // --- 3. Slogan - Scaled for compact format ---
    const slogan = options?.customSlogan || SLOGANS[bottle.bottle_number % SLOGANS.length];
    
    // Dynamic Vertical Centering
    const qrBottom = qrY + qrSizePx;
    const scanFooterOffset = mmToPx(isCompactFormat ? 4 : 6);
    const scanForContentY = cY + contentH - scanFooterOffset;
    const footerVisualTop = scanForContentY - mmToPx(isCompactFormat ? 1.5 : 2);
    
    const centerV = qrBottom + (footerVisualTop - qrBottom) / 2;

    // Split text logic for Canvas
    const sloganFontSize = isCompactFormat ? 9 : 14;
    ctx.font = `900 ${mmToPx(sloganFontSize * 0.353)}px ${getComputedStyle(document.body).fontFamily || 'Helvetica'}`;
    const words = slogan.toUpperCase().split(' ');
    const lines: string[] = [];
    let currentLine = words[0];

    const maxW = contentW - mmToPx(isCompactFormat ? 3 : 6);

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
    const maxLines = 2; // Always allow 2 lines for multiline slogans
    const limitedLines = lines.slice(0, maxLines);

    // Prepare Lines
    const preparedLines = [];
    for (const line of limitedLines) {
         const lineImgData = await renderStyledTextAsImage(line, BRAND.colors.textDark, sloganFontSize, {
            fontWeight: '900',
            uppercase: true,
            letterSpacing: isCompactFormat ? 0.03 : 0.05
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
    
    // --- 4. Footer - Compact version ---
    const footerY = cY + contentH - mmToPx(2);
    
    const footerFontSize = isCompactFormat ? 5 : 6;
    const urlFontSize = isCompactFormat ? 5.5 : 7;
    const ctaOffset = mmToPx(isCompactFormat ? 2.5 : 4);
    
    // CTA: SCAN FOR CONTENT
    ctx.font = `bold ${mmToPx(footerFontSize * 0.353)}px Helvetica, Arial, sans-serif`;
    ctx.fillStyle = '#969696';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText("SCAN FOR CONTENT", cX + contentW / 2, footerY - ctaOffset); 

    ctx.fillStyle = '#000000';
    ctx.font = `400 ${mmToPx(urlFontSize * 0.353)}px Helvetica, Arial, sans-serif`;
    const footerText = options?.isPremiumBranding && options?.breweryName ? options.breweryName : "botllab.de";
    ctx.fillText(footerText, cX + contentW / 2, footerY);

    return canvas.toDataURL('image/png');
};
