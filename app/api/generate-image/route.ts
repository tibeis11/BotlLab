import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Hinweis: Das SDK @google/generative-ai unterstützt Imagen noch nicht, 
// daher nutzen wir fetch direkt gegen die REST API.
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  try {
    const { prompt, brewId } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is missing" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    // 1. Imagen Endpunkt auf Google AI Studio (generativelanguage)
    // Wir nutzen "imagen-4.0-fast-generate-001" da dieser evtl. großzügigere Quotas hat,
    // oder "imagen-4.0-generate-001".
    const modelName = "imagen-4.0-generate-001";
    const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;

    console.log(`[Gemini Image Gen] Calling model: ${modelName}`);

    const response = await fetch(imagenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Optimierter Prompt: 1:1, Randlos, KEIN Text (dafür ist das Template da)
        // Fokus auf Bier-Thematik (Hopfen, Malz), aber ohne Schrift
        instances: [{ prompt: prompt + " . iconic beer label art, illustration style. showing hops, barley, malt, wheat or beer foam artfully arranged. square format, full bleed, edge to edge. no text, no typography, no letters. rich colors, detailed." }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "1:1", 
          outputMimeType: "image/png"
        }
      }),
    });

    const result = await response.json();

    // 2. Fehlerprüfung
    if (!response.ok) {
      console.error("[Imagen API Error]:", JSON.stringify(result, null, 2));
      throw new Error(result.error?.message || result.error || "Fehler bei der Bildgenerierung");
    }

    // 3. Bild extrahieren
    // WICHTIG: Google ändert die API Struktur. Wir prüfen ALLE bekannten Varianten.
    // Zuletzt gesehen: { mimeType: 'image/png', bytesBase64Encoded: '...' }
    const prediction = result.predictions?.[0];
    const base64Image = prediction?.bytesBase64Encoded || prediction?.bytesBase64 || prediction?.bytes;
    
    if (!base64Image) {
       console.error("[Imagen Unexpected Response]:", JSON.stringify(result, null, 2));
       const keys = prediction ? Object.keys(prediction).join(", ") : "Keine Prediction";
       throw new Error(`Bildstruktur unbekannt. Erhaltene Keys: ${keys}`);
    }

    const imageBuffer = Buffer.from(base64Image, "base64");
    
    // Fallback ID falls brewId fehlt
    const cleanBrewId = brewId || `temp-${Date.now()}`;
    const fileName = `brew-${cleanBrewId}.png`;

    // 4. Upload zu Supabase
    const { error: uploadError } = await supabase.storage
      .from('labels')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('labels').getPublicUrl(fileName);
    const finalUrl = `${publicUrl}?t=${Date.now()}`;

    // 5. URL in der Datenbank speichern, wenn eine brewId vorhanden ist
    if (brewId) {
      await supabase
        .from('brews')
        .update({ image_url: finalUrl })
        .eq('id', brewId);
    }

    return NextResponse.json({ imageUrl: finalUrl });

  } catch (error: any) {
    console.error("[Generate Image Route Error]:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}