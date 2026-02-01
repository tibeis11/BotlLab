import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { LabelDesign, LabelElement, LabelVariables } from './types/label-system';
import { getSmartLabelConfig } from './smart-labels-config';
import { fetchAssetAsBase64, preloadFonts } from './utils/label-assets';
import { ptToMm } from './utils/label-units';

// Interface for bottle data specific to the new system
export interface SmartBottleData {
  id: string;
  bottle_number: number;
  qrUrl?: string;
  // Additional data for variable replacement
  batchNr?: string;
  brewDate?: string;
  brewName?: string;
  brewStyle?: string;
}

/**
 * Replaces placeholders like {{batch_nr}} with actual values.
 */
const replaceVariables = (text: string, variables: LabelVariables): string => {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return (variables as any)[key] || '';
  });
};

/**
 * Renders a single element onto the PDF document.
 * 
 * @param doc The jsPDF instance
 * @param element The element configuration from JSON
 * @param offsetX Absolute X position of the label on the sheet (mm)
 * @param offsetY Absolute Y position of the label on the sheet (mm)
 * @param variables Data for variable replacement (e.g. QR code content)
 * @param assets Preloaded assets (images, fonts)
 */
const renderElementToPdf = async (
  doc: jsPDF, 
  element: LabelElement, 
  offsetX: number, 
  offsetY: number, 
  variables: LabelVariables,
  assets: Record<string, string> // Map of URL -> Base64
) => {
  // Calculate absolute position on the page
  const x = offsetX + element.x;
  const y = offsetY + element.y;
  
  // Apply rotation if needed (requires advanced context saving/restoring in jsPDF)
  // For V1, we might skip rotation or handle it only for images/text simply
  if (element.rotation !== 0) {
    // Rotation logic would go here. 
    // jsPDF advanced API: doc.setCurrentTransformationMatrix(...)
    // For now, let's keep it simple and assume 0 rotation for V1 stability.
  }

  if (element.type === 'text') {
    const text = replaceVariables(element.content, variables);
    
    // Font settings
    // Note: Fonts must be added to VFS before calling this
    if (element.style.fontFamily) {
        doc.setFont(element.style.fontFamily, element.style.fontWeight || 'normal');
    }
    
    // Size (pt -> mm conversion happens internally in jsPDF if unit is mm? 
    // No, setFontSize expects Points even if document unit is mm)
    doc.setFontSize(element.style.fontSize);
    
    // Color
    if (element.style.color) {
      doc.setTextColor(element.style.color); // Hex string works in recent jsPDF
    }
    
    // Alignment logic
    // jsPDF text x is start of text. For center/right, we need to adjust x.
    // However, our data model stores x/y as top-left of the bounding box?
    // OR does it store x/y as the anchor point?
    // Let's assume x/y is top-left of the bounding box for simplicity in the Editor.
    // But jsPDF text() uses baseline. This is tricky!
    
    // Correction: To match HTML/CSS "top-left" positioning:
    // We need to add the font ascent to Y.
    // Approximation: fontSize * 0.35 (mm) roughly.
    const textY = y + ptToMm(element.style.fontSize) * 0.8; // Rough baseline adjust
    
    let textX = x;
    const align = element.style.textAlign || 'left';
    
    if (align === 'center') {
        textX = x + element.width / 2;
    } else if (align === 'right') {
        textX = x + element.width;
    }
    
    doc.text(text, textX, textY, { align: align as 'left'|'center'|'right' });
  
  } else if (element.type === 'image') {
    // Images are simple: x, y, w, h
    // We need the base64 content.
    // If element.content is a URL, look it up in 'assets' map
    let imgData = assets[element.content];
    
    // Fallback: If not in assets (maybe it's a raw base64 string already?)
    if (!imgData && element.content.startsWith('data:image')) {
        imgData = element.content;
    }

    if (imgData) {
        try {
            doc.addImage(imgData, 'PNG', x, y, element.width, element.height);
        } catch (e) {
            console.warn('Failed to add image to PDF', element.id);
        }
    }

  } else if (element.type === 'qr-code') {
    // QR Code content is dynamic from variables
    const qrContent = variables.qr_code;
    if (qrContent) {
        try {
            // Generate QR on the fly (fast enough for 50 items)
            // or we could preload them. For now, on-the-fly.
            const qrDataUrl = await QRCode.toDataURL(qrContent, {
                errorCorrectionLevel: 'M',
                margin: 0,
                width: 500,
                color: { 
                    dark: element.style.color || '#000000', 
                    light: '#00000000' // Transparent background
                }
            });
            doc.addImage(qrDataUrl, 'PNG', x, y, element.width, element.height);
        } catch (e) {
            console.error('QR Generation failed');
        }
    }
  } else if (element.type === 'shape') {
      // Draw Rectangle / Circle
      if (element.style.backgroundColor) {
          doc.setFillColor(element.style.backgroundColor);
          if (element.style.borderRadius) {
              doc.roundedRect(x, y, element.width, element.height, element.style.borderRadius, element.style.borderRadius, 'F');
          } else {
              doc.rect(x, y, element.width, element.height, 'F');
          }
      }
      if (element.style.borderColor && element.style.borderWidth) {
          doc.setDrawColor(element.style.borderColor);
          doc.setLineWidth(element.style.borderWidth);
          // Draw stroke (same rect logic)
          if (element.style.borderRadius) {
              doc.roundedRect(x, y, element.width, element.height, element.style.borderRadius, element.style.borderRadius, 'D');
          } else {
              doc.rect(x, y, element.width, element.height, 'D');
          }
      }
  }
};

/**
 * Main Entry Point: Generates a full PDF from a design template and a list of bottles.
 */
export const generateLabelBatchPdf = async (
    design: LabelDesign, 
    bottles: SmartBottleData[],
    globalVariables: Partial<LabelVariables> // e.g. brew_name, batch_nr (shared)
): Promise<jsPDF> => {
    
    // 1. Setup PDF based on A4 format
    const doc = new jsPDF({
        orientation: 'landscape', // Most Avery sheets are landscape usage
        unit: 'mm',
        format: 'a4'
    });

    // 2. Load Config (Avery Dimensions)
    const formatConfig = getSmartLabelConfig(design.formatId);
    
    // 3. Preload Assets (Images & Fonts)
    // Extract all image URLs from design
    const imageUrls = design.elements
        .filter(el => el.type === 'image' && !el.content.startsWith('data:'))
        .map(el => el.content);
        
    // Add background image if it exists and is a URL
    if (design.background.type === 'image' && design.background.value && !design.background.value.startsWith('data:')) {
        imageUrls.push(design.background.value);
    }

    const uniqueUrls = Array.from(new Set(imageUrls));
    const assetMap: Record<string, string> = {};
    
    // Load images
    await Promise.all(uniqueUrls.map(async (url) => {
        try {
            assetMap[url] = await fetchAssetAsBase64(url);
        } catch (e) {
            console.warn(`Failed to preload image: ${url}`);
        }
    }));

    // TODO: Load Fonts here if we support custom fonts later
    // await preloadFonts(design.fonts...)

    // 4. Render Loop
    let col = 0;
    let row = 0;
    let pageCount = 1;

    for (let i = 0; i < bottles.length; i++) {
        const bottle = bottles[i];
        
        // Calculate Grid Position
        const xOffset = formatConfig.marginLeft + (col * formatConfig.width);
        const yOffset = formatConfig.marginTop + (row * formatConfig.height);

        // Prepare Variables for this specific bottle
        const variables: LabelVariables = {
            brew_name: globalVariables.brew_name || '',
            brew_style: globalVariables.brew_style || '',
            brew_date: globalVariables.brew_date || '',
            batch_nr: globalVariables.batch_nr || '',
            abv: globalVariables.abv || '',
            ibu: globalVariables.ibu || '',
            ebc: globalVariables.ebc || '',
            qr_code: `https://botllab.de/b/${bottle.id}`, // Build the full URL
            bottle_nr: String(bottle.bottle_number).padStart(3, '0'),
            total_bottles: String(bottles.length)
        };

        // A. Draw Background
        if (design.background.type === 'color') {
            doc.setFillColor(design.background.value);
            doc.rect(xOffset, yOffset, formatConfig.width, formatConfig.height, 'F');
        } else if (design.background.type === 'image') {
            const bgData = assetMap[design.background.value] || design.background.value;
            if (bgData) {
                doc.addImage(bgData, 'PNG', xOffset, yOffset, formatConfig.width, formatConfig.height);
            }
        }

        // B. Draw Elements (Sorted by Z-Index)
        const sortedElements = [...design.elements].sort((a, b) => a.zIndex - b.zIndex);
        
        for (const element of sortedElements) {
            await renderElementToPdf(doc, element, xOffset, yOffset, variables, assetMap);
        }

        // C. Grid Advancement
        col++;
        if (col >= formatConfig.cols) {
            col = 0;
            row++;
            if (row >= formatConfig.rows) {
                // Check if more bottles coming
                if (i < bottles.length - 1) {
                    doc.addPage();
                    pageCount++;
                    row = 0;
                }
            }
        }
    }

    return doc;
};
