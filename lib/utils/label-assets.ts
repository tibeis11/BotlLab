/**
 * Utility to load external assets (Images, Fonts) as Base64 strings.
 * This is crucial for jsPDF to avoid CORS issues and render correctly.
 */

export const fetchAssetAsBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch asset: ${response.statusText}`);
    
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Error loading asset ${url}:`, error);
    throw error;
  }
};

/**
 * Preloads a list of fonts for jsPDF.
 * Returns a map of fontName -> base64String.
 */
export const preloadFonts = async (fonts: { name: string; url: string }[]): Promise<Record<string, string>> => {
  const fontMap: Record<string, string> = {};
  
  const promises = fonts.map(async (font) => {
    try {
      // For local public/fonts, we can fetch them directly
      // Note: In production, ensure these are accessible via public URL
      const base64 = await fetchAssetAsBase64(font.url);
      // Remove the data URL prefix (e.g. "data:font/ttf;base64,") for jsPDF addFileToVFS
      const rawBase64 = base64.split(',')[1];
      fontMap[font.name] = rawBase64;
    } catch (e) {
      console.warn(`Could not load font ${font.name}`, e);
    }
  });

  await Promise.all(promises);
  return fontMap;
};

export const STANDARD_FONTS = [
  { name: 'Roboto-Regular', url: '/fonts/Roboto-Regular.ttf' },
  { name: 'Roboto-Bold', url: '/fonts/Roboto-Bold.ttf' },
  { name: 'OpenSans-Regular', url: '/fonts/OpenSans-Regular.ttf' },
  { name: 'OpenSans-Bold', url: '/fonts/OpenSans-Bold.ttf' },
  { name: 'Montserrat-Regular', url: '/fonts/Montserrat-Regular.ttf' },
  { name: 'Montserrat-Bold', url: '/fonts/Montserrat-Bold.ttf' },
  { name: 'PlayfairDisplay-Regular', url: '/fonts/PlayfairDisplay-Regular.ttf' },
  { name: 'PlayfairDisplay-Bold', url: '/fonts/PlayfairDisplay-Bold.ttf' },
  // Add more fonts here later
];
