export const loadLogoAsBase64 = async (path: string = '/brand/logo.png'): Promise<string> => {
    try {
        const response = await fetch(path);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('Failed to convert logo to base64'));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error('Failed to load logo asset:', e);
        // Return transparent 1x1 pixel as fallback to prevent crash
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    }
};

/**
 * Loads the logo with text (BotlLab branding) as base64
 */
export const loadLogoWithTextAsBase64 = async (): Promise<string> => {
    return loadLogoAsBase64('/brand/logo_withName.svg');
};

/**
 * Renders the "BotlLab" text using the browser's native font rendering (accessing the web fonts)
 * and returns it as a PNG base64 string. Use this to get exact font matching in PDF.
 */
export const renderBrandTextAsImage = async (
    textParts: { text: string; color: string; fontWeight?: string }[],
    fontSizePt: number
): Promise<{ dataUrl: string; width: number; height: number; ratio: number }> => {
    if (typeof window === 'undefined') {
        throw new Error('Canvas rendering only works on client side');
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Scale factor for high resolution print
    const scale = 4;
    // Convert pt to px (approximate 1pt = 1.333px)
    const fontSizePx = fontSizePt * 1.333; 
    
    // Get the correct font family from the body (which uses Geist)
    const fontFamily = getComputedStyle(document.body).fontFamily;
    // Use 900 (black/extrabold) to match font-black from header
    const fontString = `900 ${fontSizePx * scale}px ${fontFamily}`;

    ctx.font = fontString;
    
    // tracking-tighter in Tailwind = letter-spacing: -0.05em
    const letterSpacing = -0.05 * fontSizePx * scale;
    
    // Calculate width with tight letter spacing
    let totalWidth = 0;
    textParts.forEach(part => {
        const textWidth = ctx.measureText(part.text).width;
        // Add width minus spacing for tighter tracking
        totalWidth += textWidth + (letterSpacing * (part.text.length - 1));
    });

    // Add some padding/height (approximate based on font size)
    const height = fontSizePx * 1.5 * scale; 
    
    // Resize canvas
    canvas.width = totalWidth;
    canvas.height = height;

    // Reset context after resize
    ctx.scale(1, 1);
    // Re-set font because canvas resize clears context
    ctx.font = fontString;
    ctx.textBaseline = 'middle';

    // Draw with manual letter spacing
    let currentX = 0;
    const centerY = height / 2;

    textParts.forEach(part => {
        ctx.fillStyle = part.color;
        
        // Draw each character with manual spacing for tracking-tighter
        for (let i = 0; i < part.text.length; i++) {
            const char = part.text[i];
            ctx.fillText(char, currentX, centerY + (fontSizePx * scale * 0.05));
            currentX += ctx.measureText(char).width + letterSpacing;
        }
    });

    return {
        dataUrl: canvas.toDataURL('image/png'),
        width: totalWidth / scale, // return logical pixels
        height: height / scale,
        ratio: totalWidth / height
    };
};

export interface TextStyleOptions {
    fontWeight?: string; // e.g. "900", "bold", "normal"
    letterSpacing?: number; // relative to font size, e.g. 0.05
    fontFamily?: string; // defaults to body font
    uppercase?: boolean;
}

/**
 * Renders arbitrary text as an image using the application's font stack.
 * Useful for ensuring elements like slogans match the brand typography in PDFs.
 */
export const renderStyledTextAsImage = async (
    text: string, 
    color: string, 
    fontSizePt: number,
    options: TextStyleOptions = {}
): Promise<{ dataUrl: string; width: number; height: number; ratio: number }> => {
    if (typeof window === 'undefined') {
        throw new Error('Canvas rendering only works on client side');
    }

    const {
        fontWeight = "700",
        letterSpacing: spacingFactor = 0,
        uppercase = false
    } = options;

    const textToRender = uppercase ? text.toUpperCase() : text;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    const scale = 4;
    const fontSizePx = fontSizePt * 1.333; 
    
    // Use App Font (Geist)
    const fontFamily = options.fontFamily || getComputedStyle(document.body).fontFamily;
    const fontString = `${fontWeight} ${fontSizePx * scale}px ${fontFamily}`;

    ctx.font = fontString;
    
    const letterSpacing = spacingFactor * fontSizePx * scale;
    
    // Calculate width
    let totalWidth = 0;
    // We render char by char to apply manual letter spacing
    for (let i = 0; i < textToRender.length; i++) {
        const char = textToRender[i];
        totalWidth += ctx.measureText(char).width;
        if (i < textToRender.length - 1) {
            totalWidth += letterSpacing;
        }
    }

    const height = fontSizePx * 1.5 * scale;
    
    canvas.width = Math.max(totalWidth, 1); // Ensure non-zero
    canvas.height = height;

    ctx.scale(1, 1);
    ctx.font = fontString;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;

    let currentX = 0;
    const centerY = height / 2;

    for (let i = 0; i < textToRender.length; i++) {
        const char = textToRender[i];
        ctx.fillText(char, currentX, centerY + (fontSizePx * scale * 0.05)); // slight vertical adjustment
        currentX += ctx.measureText(char).width + letterSpacing;
    }

    return {
        dataUrl: canvas.toDataURL('image/png'),
        width: totalWidth / scale,
        height: height / scale,
        ratio: totalWidth / height
    };
};
