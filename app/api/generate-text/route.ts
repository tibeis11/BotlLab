import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export async function POST(req: NextRequest) {
	try {
		const { type, context, details, brewType, style, recipeData } = await req.json();

		if (!process.env.GOOGLE_AI_API_KEY) {
			return NextResponse.json({ error: 'API-Schlüssel fehlt' }, { status: 500 });
		}

		const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

		let prompt = '';

		if (type === 'name') {
			prompt = `Generate a creative, catchy name for a ${brewType} with the following characteristics: ${context || style || 'craft beverage'}.

Requirements:
- Keep it short (1-4 words)
- Make it memorable and unique
- Consider the style and ingredients
- Avoid generic names
- Don't use quotes or special formatting
- Return ONLY the name, nothing else

Examples of good names:
- "Cosmic Haze Navigator"
- "Velvet Thunder IPA"
- "Golden Harvest Sunset"
- "Midnight Berry Fusion"

Now generate ONE creative name:`;
		} else if (type === 'description') {
			prompt = `Write a compelling, professional description for a ${brewType} with these characteristics: ${details || style || 'craft beverage'}.

Requirements:
- Write 2-4 sentences
- Focus on flavors, aromas, appearance, and mouthfeel
- Use descriptive, sensory language
- Sound professional but approachable
- Write in German
- Don't use quotes or special formatting
- Return ONLY the description text

Example style:
"Ein vollmundiges IPA mit intensiven Zitrus- und tropischen Fruchtaromen. Die Kombination aus Citra und Mosaic Hopfen sorgt für eine ausgewogene Bittere bei 45 IBU. Goldgelbe Farbe mit cremiger Schaumkrone. Perfekt für warme Sommerabende."

Now write a description:`;
		} else if (type === 'optimization') {
			const data = recipeData || {};
			const brewTypeGerman = data.brewType === 'beer' ? 'Bier' : 
									data.brewType === 'wine' ? 'Wein' : 
									data.brewType === 'cider' ? 'Cider' : 
									data.brewType === 'mead' ? 'Met' : 'Getränk';
			
			prompt = `Du bist ein erfahrener Braumeister/Sommelier. Analysiere dieses ${brewTypeGerman}-Rezept und gib konkrete Verbesserungsvorschläge:

Rezept-Details:
- Name: ${data.name || 'Nicht angegeben'}
- Stil: ${data.style || 'Nicht angegeben'}
- Typ: ${brewTypeGerman}
${data.abv ? `- ABV: ${data.abv}%` : ''}
${data.ibu ? `- IBU: ${data.ibu}` : ''}
${data.srm ? `- SRM: ${data.srm}` : ''}
${data.og ? `- OG: ${data.og}` : ''}
${data.fg ? `- FG: ${data.fg}` : ''}
${data.malts ? `- Malze: ${data.malts}` : ''}
${data.hops ? `- Hopfen: ${data.hops}` : ''}
${data.yeast ? `- Hefe: ${data.yeast}` : ''}
${data.dryHop ? `- Dry Hop: ${data.dryHop}g` : ''}
${data.boilMinutes ? `- Kochzeit: ${data.boilMinutes} min` : ''}
${data.mashTemp ? `- Maischetemperatur: ${data.mashTemp}°C` : ''}
${data.grapes ? `- Rebsorten: ${data.grapes}` : ''}
${data.apples ? `- Apfelsorten: ${data.apples}` : ''}
${data.honey ? `- Honigsorten: ${data.honey}` : ''}

Anforderungen:
- Gib 3-5 konkrete, umsetzbare Verbesserungsvorschläge
- Fokussiere auf: Stil-Konformität, Balance (ABV/IBU/Malz/Hopfen), Zutaten-Harmonie, Prozess-Optimierung
- Schreibe auf Deutsch
- Jeder Vorschlag sollte 1-2 Sätze lang sein
- Sei konstruktiv und spezifisch
- Gib Vorschläge nur wenn sinnvoll (wenn Daten fehlen, schlage vor diese zu ergänzen)

Formatiere die Ausgabe als JSON-Array von Strings:
["Vorschlag 1", "Vorschlag 2", "Vorschlag 3"]

WICHTIG: Antworte NUR mit dem JSON-Array, keine zusätzlichen Erklärungen!`;
		} else {
			return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
		}

		const result = await model.generateContent(prompt);
		const text = result.response.text().trim();

		if (type === 'optimization') {
			// Parse JSON array from response
			try {
				// Extract JSON array if wrapped in markdown code blocks
				let jsonText = text;
				const jsonMatch = text.match(/\[[\s\S]*\]/);
				if (jsonMatch) {
					jsonText = jsonMatch[0];
				}
				
				const suggestions = JSON.parse(jsonText);
				if (Array.isArray(suggestions)) {
					return NextResponse.json({ suggestions });
				} else {
					return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
				}
			} catch (parseError) {
				console.error('JSON parse error:', parseError, 'Response:', text);
				return NextResponse.json({ error: 'Failed to parse suggestions' }, { status: 500 });
			}
		}

		// Clean up the response for name/description - remove quotes, markdown, etc.
		const cleanText = text
			.replace(/^["']|["']$/g, '') // Remove quotes at start/end
			.replace(/^\*\*|\*\*$/g, '') // Remove bold markdown
			.replace(/^#+\s*/g, '') // Remove markdown headers
			.trim();

		return NextResponse.json({ text: cleanText });
	} catch (error: any) {
		console.error('Text generation error:', error);
		return NextResponse.json(
			{ error: error.message || 'Generierung fehlgeschlagen' },
			{ status: 500 }
		);
	}
}
