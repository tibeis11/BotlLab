export const BRAND = {
  name: "BotlLab",
  
  // Visual Assets
  logo: {
    path: "/brand/logo.png",
    pathSvg: "/brand/logo.svg",
    alt: "BotlLab Logo",
  },

  // Color Palette (matching Tailwind/CSS variables)
  colors: {
    // Primary Brand Color (Cyan-500)
    primary: "#06b6d4", 
    rgbPrimary: [6, 182, 212],

      // Dark Text (Zinc-900) - Stronger contrast for Print
    textDark: "#18181b", 
    rgbTextDark: [24, 24, 27],

    // Light Text (Zinc-100) - For Dark Backgrounds (App UI)
    textLight: "#f4f4f5", 
    rgbTextLight: [244, 244, 245],
  },

  // Typography Settings
  typography: {
    fontFamily: "Geist Sans", // Primary visual font (Web)
    pdfFallbackFont: "Helvetica", // Technical fallback for PDF generation if image rendering fails
    fontWeight: "bold",
    tracking: "tighter", // CSS: tracking-tighter
  },

  // Print / PDF Specific Layout Dimensions (in mm)
  // Adjusted to match "AdminHeader" visually (Logo vs Text proportions)
  print: {
    iconSize: 6,      // 6mm x 6mm (reduced from 8mm)
    gap: 2,           // 2mm gap (reduced from 3mm)
    textSize: 12,     // 12pt (reduced from 16pt)
    textOffsetY: 4.3, // Center alignment: 3mm (Half Icon) + 1.3mm (Half Cap)
    
    // Calculated Layout helper
    getHeaderWidth: (doc: any, text1: string, text2: string) => {
       const t1W = doc.getTextWidth(text1);
       const t2W = doc.getTextWidth(text2);
       // Icon + Gap + Text1 + Text2
       return 8 + 3 + t1W + t2W;
    }
  }
} as const;
