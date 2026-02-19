import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { LabelDesign, LabelElement, LabelVariables } from './types/label-system';
import { LABEL_FORMATS } from './smart-labels-config'; // Assuming format definitions are here
import { mmToPx } from './unit-converter';

// --- FONT MANAGEMENT ---
// Map custom names to standard PDF fonts as fallback
const STANDARD_FONT_MAP: Record<string, string> = {
    'Arial': 'Helvetica',
    'Roboto': 'Helvetica',
    'OpenSans': 'Helvetica',
    'Montserrat': 'Helvetica',
    'PlayfairDisplay': 'Times',
    'Courier': 'Courier',
    'Times': 'Times',
    'Helvetica': 'Helvetica'
};

const FONT_CACHE: Record<string, { regular: ArrayBuffer | null, bold: ArrayBuffer | null, italic: ArrayBuffer | null, bolditalic: ArrayBuffer | null }> = {};
const IMAGE_CACHE: Record<string, string> = {}; // Cache for base64 images

const SUPPORTED_FONTS = [
  'Roboto',
  'OpenSans',
  'Montserrat',
  'PlayfairDisplay',
  // Add other fonts from the "Safe List" here
];

function resolveUrl(url: string, baseUrl?: string): string {
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    if (baseUrl) {
        return `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
    }
    return url;
}

async function fetchFont(url: string, baseUrl?: string): Promise<ArrayBuffer | null> {
    const finalUrl = resolveUrl(url, baseUrl);
    try {
        const res = await fetch(finalUrl);
        if (!res.ok) return null;
        return await res.arrayBuffer();
    } catch (e) {
        console.warn(`Failed to fetch font: ${finalUrl}`);
        return null;
    }
}

async function loadFont(fontName: string, baseUrl?: string): Promise<void> {
  if (FONT_CACHE[fontName]) return;

  // Attempt to load all variants, but don't fail if some are missing.
  // Standard naming convention: FontName-Regular.ttf, FontName-Bold.ttf, etc.
  const [regular, bold, italic, bolditalic] = await Promise.all([
    fetchFont(`/fonts/${fontName}-Regular.ttf`, baseUrl),
    fetchFont(`/fonts/${fontName}-Bold.ttf`, baseUrl),
    fetchFont(`/fonts/${fontName}-Italic.ttf`, baseUrl),
    fetchFont(`/fonts/${fontName}-BoldItalic.ttf`, baseUrl),
  ]);

  FONT_CACHE[fontName] = { regular, bold, italic, bolditalic };
}

// Helper to convert ArrayBuffer to Base64 (Worker compatible)
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    // In Worker 'self.btoa' is available, in Main 'window.btoa'. Global 'btoa' handles both.
    return btoa(binary);
}

async function registerFontsInDoc(doc: jsPDF, design: LabelDesign, baseUrl?: string): Promise<void> {
  const fontsToLoad = new Set<string>();
  design.elements.forEach(el => {
    if (el.style.fontFamily) {
      fontsToLoad.add(el.style.fontFamily);
    }
  });

  for (const fontName of Array.from(fontsToLoad)) {
    if (SUPPORTED_FONTS.includes(fontName)) {
      await loadFont(fontName, baseUrl);
      if (FONT_CACHE[fontName]?.regular) {
        doc.addFileToVFS(`${fontName}-Regular.ttf`, arrayBufferToBase64(FONT_CACHE[fontName].regular!));
        doc.addFont(`${fontName}-Regular.ttf`, fontName, 'normal');
      }
      if (FONT_CACHE[fontName]?.bold) {
        doc.addFileToVFS(`${fontName}-Bold.ttf`, arrayBufferToBase64(FONT_CACHE[fontName].bold!));
        doc.addFont(`${fontName}-Bold.ttf`, fontName, 'bold');
      }
       if (FONT_CACHE[fontName]?.italic) {
        doc.addFileToVFS(`${fontName}-Italic.ttf`, arrayBufferToBase64(FONT_CACHE[fontName].italic!));
        doc.addFont(`${fontName}-Italic.ttf`, fontName, 'italic');
      }
      if (FONT_CACHE[fontName]?.bolditalic) {
        doc.addFileToVFS(`${fontName}-BoldItalic.ttf`, arrayBufferToBase64(FONT_CACHE[fontName].bolditalic!));
        doc.addFont(`${fontName}-BoldItalic.ttf`, fontName, 'bolditalic');
      }
    }
  }
}


/** Preloads image from a URL and converts it to a base64 data URL. */
async function loadImage(url: string, baseUrl?: string): Promise<string> {
    const finalUrl = resolveUrl(url, baseUrl);
    if (IMAGE_CACHE[finalUrl]) return IMAGE_CACHE[finalUrl];
    try {
        const response = await fetch(finalUrl);
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
        IMAGE_CACHE[finalUrl] = dataUrl;
        return dataUrl;
    } catch (e) {
        console.error(`Failed to load image: ${finalUrl}`, e);
        return ''; // Return empty string on failure
    }
}
// --- END FONT MANAGEMENT ---

/**
 * Rotates a point (x,y) around a center (cx,cy) by a given angle in degrees.
 */
function getRotatedPoint(x: number, y: number, cx: number, cy: number, angleDegrees: number) {
    if (angleDegrees === 0) return { x, y };
    const rad = angleDegrees * (Math.PI / 180);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = x - cx;
    const dy = y - cy;
    return {
        x: cx + (dx * cos - dy * sin),
        y: cy + (dx * sin + dy * cos)
    };
}


/**
 * Replaces placeholders like {{brew_name}} in a string with values from the variables object.
 */
function replacePlaceholders(text: string, variables: LabelVariables): string {
    if (!text || !text.includes('{{')) return text;
    let result = text;
    // Ensure variables is an object before iterating
    if (variables && typeof variables === 'object') {
        for (const key in variables) {
            // Check for property existence
            if (Object.prototype.hasOwnProperty.call(variables, key)) {
                const placeholder = `{{${key}}}`;
                const value = (variables as any)[key] || ''; // Fallback to empty string
                result = result.replace(new RegExp(placeholder, 'g'), value);
            }
        }
    }
    return result;
}


/**
 * Renders a single label element onto the jsPDF document at a given offset.
 */
async function renderElementToPdf(doc: jsPDF, element: LabelElement, offsetX: number, offsetY: number) {
    const x = offsetX + element.x;
    const y = offsetY + element.y;
    const rotation = element.rotation || 0;
    
    // Center of the element box
    const cx = x + element.width / 2;
    const cy = y + element.height / 2;

    // Set opacity if defined
    if (element.style.opacity !== undefined && element.style.opacity < 1) {
        (doc as any).setGState(new (doc as any).GState({ opacity: element.style.opacity }));
    }

    switch (element.type) {
        case 'text':
            const isBold = element.style.fontWeight === 'bold';
            const isItalic = element.style.fontStyle === 'italic';
            let fontStyle = 'normal';
            if (isBold && isItalic) fontStyle = 'bolditalic';
            else if (isBold) fontStyle = 'bold';
            else if (isItalic) fontStyle = 'italic';

            // Resolve Font Family
            // Check if the requested font is available in our cache (meaning it was loaded successfully)
            // If not, fall back to a standard font mapping to avoid the ugly Times New Roman default.
            let fontFamily = element.style.fontFamily || 'Helvetica';
            const isCustomFontLoaded = FONT_CACHE[fontFamily] && (
                FONT_CACHE[fontFamily].regular || 
                FONT_CACHE[fontFamily].bold || 
                FONT_CACHE[fontFamily].italic || 
                FONT_CACHE[fontFamily].bolditalic
            );

            if (!isCustomFontLoaded && STANDARD_FONT_MAP[fontFamily]) {
                fontFamily = STANDARD_FONT_MAP[fontFamily];
            }
            
            doc.setFont(fontFamily, fontStyle);
            doc.setFontSize(element.style.fontSize || 10);
            doc.setTextColor(element.style.color || '#000000');
            
            // 1. Prepare Content (Split into lines)
            const boxWidth = element.width > 0 ? element.width : 200;
            const textLines = doc.splitTextToSize(element.content, boxWidth);
            
            // 2. Metrics
            // Match the default line height from LabelCanvas (1.2 vs 1.15)
            const lineHeightFactor = element.style.lineHeight || 1.2; 
            const fontSizeMm = (element.style.fontSize || 10) * 0.3528; // pt to mm
            const lineHeightMm = fontSizeMm * lineHeightFactor;
            const totalBlockHeight = textLines.length * lineHeightMm;
            
            // 3. Start Position (Center Block Vertically)
            // Top of the block in unrotated space relative to element top
            // Note: doc.text draws at the baseline.
            // Heuristic connection: The first line's baseline is roughly 0.8 * fontSize down from the top.
            // But we need to center the *visual block*.
            
            const startY = (y + element.height / 2) - (totalBlockHeight / 2);

            // 4. Render Line by Line
            // We iterate manually to ensure absolute control over positioning and rotation of each line
            textLines.forEach((line: string, i: number) => {
                // Line Y (Baseline)
                // Add ascent (approx 0.8 of font size) + current line offset
                // Adjusting baseline factor to 0.75 to better match browser rendering (cap-height vs ascender)
                const lineBaseY = startY + (i * lineHeightMm) + (fontSizeMm * 0.75);
                
                // Determine Anchor X based on alignment
                let anchorX = x;
                let finalAlign: 'left' | 'center' | 'right' = 'left';

                if (element.style.textAlign === 'center') {
                    anchorX = x + element.width / 2;
                    finalAlign = 'center';
                } else if (element.style.textAlign === 'right') {
                    anchorX = x + element.width;
                    finalAlign = 'right';
                }

                // Rotate this anchor point around the Element Center (cx, cy)
                let finalX = anchorX;
                let finalY = lineBaseY;

                if (rotation !== 0) {
                     const rotated = getRotatedPoint(anchorX, lineBaseY, cx, cy, rotation);
                     finalX = rotated.x;
                     finalY = rotated.y;
                }

                doc.text(line, finalX, finalY, {
                    align: finalAlign,
                    angle: -rotation
                });

                // Render Underline if needed
                if (element.style.textDecoration === 'underline') {
                    const textWidth = doc.getTextWidth(line);
                    let lineStartX = anchorX;
                    
                    if (finalAlign === 'center') {
                        lineStartX = anchorX - (textWidth / 2);
                    } else if (finalAlign === 'right') {
                        lineStartX = anchorX - textWidth;
                    }
                    
                    // Position underline below baseline with 5% offset
                    const underlineY = lineBaseY + (fontSizeMm * 0.05); 
                    const lineEndX = lineStartX + textWidth;

                    let p1 = { x: lineStartX, y: underlineY };
                    let p2 = { x: lineEndX, y: underlineY };

                    if (rotation !== 0) {
                        p1 = getRotatedPoint(p1.x, p1.y, cx, cy, rotation);
                        p2 = getRotatedPoint(p2.x, p2.y, cx, cy, rotation);
                    }
                    
                    // Set color to match text
                    doc.setDrawColor(element.style.color || '#000000');
                    
                    // Thickness approx 0.06em
                    doc.setLineWidth(fontSizeMm * 0.06); 
                    
                    doc.line(p1.x, p1.y, p2.x, p2.y);
                }
            });
            break;

        case 'image':
            if (element.content) {
                // The content for an image is its URL, which is already a base64 string from preloading
                try {
                    // Use 'NONE' compression for better quality (especially for Logos/Graphics)
                    const compression = 'NONE'; 
                    
                    if (rotation !== 0) {
                        const rad = rotation * (Math.PI / 180);
                        const cos = Math.cos(rad);
                        const sin = Math.sin(rad);
                        // Vector from Top-Left to Center (w/2, h/2)
                        const vx = element.width / 2;
                        const vy = element.height / 2;
                        // Rotate this vector
                        const vx_rot = vx * cos - vy * sin;
                        const vy_rot = vx * sin + vy * cos;
                        // New Top-Left
                        const rotX = cx - vx_rot;
                        const rotY = cy - vy_rot;
                        
                        doc.addImage(element.content, 'PNG', rotX, rotY, element.width, element.height, undefined, compression, rotation);
                    } else {
                        doc.addImage(element.content, 'PNG', x, y, element.width, element.height, undefined, compression);
                    }
                } catch(e) {
                    console.error("Failed to add image to PDF:", e);
                }
            }
            break;

        case 'qr-code':
             if (element.content) { // Content is the generated QR code data URL
                try {
                    // QR Codes need sharp edges, no compression artifacts
                    const compression = 'NONE';

                    if (rotation !== 0) {
                         const rad = rotation * (Math.PI / 180);
                         const cos = Math.cos(rad);
                         const sin = Math.sin(rad);
                         const vx = element.width / 2;
                         const vy = element.height / 2;
                         const vx_rot = vx * cos - vy * sin;
                         const vy_rot = vx * sin + vy * cos;
                         const rotX = cx - vx_rot;
                         const rotY = cy - vy_rot;
                         doc.addImage(element.content, 'PNG', rotX, rotY, element.width, element.height, undefined, compression, rotation);
                    } else {
                        doc.addImage(element.content, 'PNG', x, y, element.width, element.height, undefined, compression);
                    }
                } catch(e) {
                    console.error("Failed to add QR code to PDF:", e);
                }
            }
            break;

        case 'brand-logo':
            try {
                const logoBase64 = IMAGE_CACHE['/brand/logo_withName.png'];
                if (logoBase64) {
                    // Render the combined logo and name image to fit the element box
                    doc.addImage(logoBase64, 'PNG', x, y, element.width, element.height);
                }
            } catch(e) {
                console.error("Failed to add brand logo to PDF:", e);
            }
            break;

        case 'brand-footer':
            try {
                doc.setFont('Helvetica', 'normal');
                doc.setFontSize(element.style.fontSize || 8);
                doc.setTextColor(element.style.color || '#666666'); // Dark grey

                const lines = (element.content || '').split('\n');
                let textX = x;
                if (element.style.textAlign === 'center') {
                    textX = x + (element.width / 2);
                } else if (element.style.textAlign === 'right') {
                    textX = x + element.width;
                }
                // Vertically center the block of text within the element's height
                const lineHeightMm = (element.style.fontSize || 6) * 0.3527 * 1.2; // 1.2 for line spacing
                const totalTextHeight = lines.length * lineHeightMm;
                const startTextY = y + (element.height / 2) - (totalTextHeight / 2) + (lineHeightMm * 0.75); // Adjust for baseline

                doc.text(lines, textX, startTextY, {
                    align: element.style.textAlign || 'left',
                    maxWidth: element.width > 0 ? element.width : undefined,
                    lineHeightFactor: 1.2
                });
            } catch(e) {
                console.error("Failed to add brand footer to PDF:", e);
            }
            break;

        case 'shape':
            const style = element.style;
            const hasFill = style.backgroundColor && style.backgroundColor !== 'transparent';
            const hasStroke = style.borderWidth && style.borderWidth > 0 && style.borderColor;

            if (hasFill) {
                doc.setFillColor(style.backgroundColor!);
            }
            if (hasStroke) {
                doc.setDrawColor(style.borderColor!);
                doc.setLineWidth(style.borderWidth!);
            }

            if (rotation !== 0) {
                 // Calculate 4 corners rotated around cx, cy
                 const tl = getRotatedPoint(x, y, cx, cy, rotation);
                 const tr = getRotatedPoint(x + element.width, y, cx, cy, rotation);
                 const br = getRotatedPoint(x + element.width, y + element.height, cx, cy, rotation);
                 const bl = getRotatedPoint(x, y + element.height, cx, cy, rotation);
                 
                 // Draw polygon
                 const drawStyle = (hasFill && hasStroke) ? 'FD' : (hasFill ? 'F' : 'S');
                 // doc.lines uses relative vectors from start point
                 doc.lines([
                     [tr.x - tl.x, tr.y - tl.y],
                     [br.x - tr.x, br.y - tr.y],
                     [bl.x - br.x, bl.y - br.y]
                 ], tl.x, tl.y, [1, 1], drawStyle, true);
            } else {
                let drawStyle: 'F' | 'S' | 'FD' | '' = '';
                if (hasFill && hasStroke) drawStyle = 'FD'; // Fill and Stroke
                else if (hasFill) drawStyle = 'F';    // Fill only
                else if (hasStroke) drawStyle = 'S';  // Stroke only

                // Currently only supports rectangles
                if (element.style.borderRadius && element.style.borderRadius > 0) {
                    doc.roundedRect(x, y, element.width, element.height, element.style.borderRadius, element.style.borderRadius, drawStyle);
                } else {
                    doc.rect(x, y, element.width, element.height, drawStyle);
                }
            }
            break;
    }
    
    // Reset opacity to default after rendering the element
    if (element.style.opacity !== undefined && element.style.opacity < 1) {
        (doc as any).setGState(new (doc as any).GState({ opacity: 1.0 }));
    }
}


/**
 * Generates a multi-page PDF document from a single label design and a list of variables.
 */
export async function generateLabelPdfFromDesign(
  design: LabelDesign,
  variables: LabelVariables[],
  baseUrl: string = ''
): Promise<jsPDF> {
  const format = LABEL_FORMATS[design.formatId] || LABEL_FORMATS['default'];
  
  // User Request: Invert orientation
  // Label Landscape ('l') -> PDF Portrait ('p')
  // Label Portrait ('p') -> PDF Landscape ('l')
  const labelOrientation = design.orientation || 'p';
  const pdfOrientation = labelOrientation === 'l' ? 'p' : 'l';

  const doc = new jsPDF({
    orientation: pdfOrientation,
    unit: 'mm',
    format: 'a4', // or other format based on LABEL_FORMATS config
  });

  await registerFontsInDoc(doc, design, baseUrl);

  // --- Asset Preloading ---
  const allElements = design.elements;
  if (design.background.type === 'image') {
      await loadImage(design.background.value, baseUrl);
  }
  for (const el of allElements) {
      if (el.type === 'image' && el.content) {
          await loadImage(el.content, baseUrl);
      }
      if (el.type === 'brand-logo') {
          await loadImage('/brand/logo_withName.png', baseUrl);
      }
  }
   // Pre-generate all QR codes
  const qrCodePromises = variables.map(vars => {
      if (!vars.qr_code) return Promise.resolve('');
      // If it's already a Data URL (e.g. pre-generated in main thread), use it directly
      if (typeof vars.qr_code === 'string' && vars.qr_code.startsWith('data:image')) {
          return Promise.resolve(vars.qr_code);
      }
      return QRCode.toDataURL(vars.qr_code, { errorCorrectionLevel: 'H', margin: 1 });
  });
  const qrCodeDataUrls = await Promise.all(qrCodePromises);
  // --- End Asset Preloading ---

  let col = 0;
  let row = 0;

  for (let i = 0; i < variables.length; i++) {
    const currentVars = variables[i];
    
    const xOffset = format.marginLeft + col * (design.width + (format.gapX || 0));
    const yOffset = format.marginTop + row * (design.height + (format.gapY || 0));

     // Render background
    if (design.background) {
        if (design.background.type === 'color' && design.background.value) {
            doc.setFillColor(design.background.value);
            doc.rect(xOffset, yOffset, design.width, design.height, 'F');
        } else if (design.background.type === 'image') {
            const bgUrl = resolveUrl(design.background.value, baseUrl);
            if (IMAGE_CACHE[bgUrl]) {
                 doc.addImage(IMAGE_CACHE[bgUrl], 'PNG', xOffset, yOffset, design.width, design.height);
            }
        }
    }
    
    // Render all elements
    for (const element of design.elements) {
        const finalElement = JSON.parse(JSON.stringify(element)); // Deep copy to avoid mutation
        
        // Inject variables
        if (finalElement.content) {
            finalElement.content = replacePlaceholders(finalElement.content, currentVars);
        }
        
        // Special handling for QR codes
        if (finalElement.type === 'qr-code') {
            finalElement.content = qrCodeDataUrls[i];
        }

        // Handle images from cache
        if (finalElement.type === 'image') {
             const imgUrl = resolveUrl(finalElement.content, baseUrl);
             if (IMAGE_CACHE[imgUrl]) {
                 finalElement.content = IMAGE_CACHE[imgUrl];
             }
        }

         // Handle Brand Logo (similar logic to image, using fixed path)
         if (finalElement.type === 'brand-logo') {
             const logoUrl = resolveUrl('/brand/logo_withName.png', baseUrl);
             if (IMAGE_CACHE[logoUrl]) {
                 finalElement.content = IMAGE_CACHE[logoUrl];
                 finalElement.type = 'image'; // Hack: render as image
             }
        }

        await renderElementToPdf(doc, finalElement, xOffset, yOffset);
    }
    
    // Grid management
    col++;
    if (col >= format.cols) {
      col = 0;
      row++;
      if (row >= format.rows) {
        if (i < variables.length - 1) {
          doc.addPage();
          row = 0;
        }
      }
    }
  }
  
  return doc;
}
