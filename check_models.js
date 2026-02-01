const https = require('https');

// Versuche den API Key aus der Umgebung zu laden
// Hinweis: Da wir in einem Script laufen, laden wir dotenv
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GOOGLE_AI_API_KEY;

if (!apiKey) {
  console.error("Kein GOOGLE_AI_API_KEY in .env.local gefunden.");
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.models) {
        console.log("Alle verfügbaren Modelle:");
        json.models.forEach(m => {
          console.log(`- ${m.name} (${m.supportedGenerationMethods})`);
        });

        // Text-Modelle hervorheben
        const textModels = json.models.filter(m => m.name.includes('text') || m.name.includes('gemini') || m.supportedGenerationMethods?.includes('generateContent'));
        if (textModels.length > 0) {
          console.log("\nText-Modelle:");
          textModels.forEach(m => {
            console.log(`- ${m.name} (${m.supportedGenerationMethods})`);
          });
        } else {
          console.log("\nKeine expliziten Text-Modelle gefunden.");
        }
      } else {
        console.log("Antwort enthält keine 'models':", json);
      }
    } catch (e) {
      console.error("Fehler beim Parsen:", e);
      console.log("Raw:", data);
    }
  });
}).on('error', (e) => {
  console.error("Fehler bei Request:", e);
});

// Beispiel: Text-Generierung mit Gemini 2.5 Flash
const textModel = 'models/gemini-2.5-flash';
const textUrl = `https://generativelanguage.googleapis.com/v1beta/${textModel}:generateContent?key=${apiKey}`;

const textPayload = {
  contents: [{ role: 'user', parts: [{ text: 'Schreibe einen kreativen Werbetext für ein Bier.' }] }]
};

const textReq = https.request(textUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('\nText-Generierung Antwort:');
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.error('Fehler beim Parsen:', e);
      console.log('Raw:', data);
    }
  });
});
textReq.on('error', (e) => {
  console.error('Fehler bei Request:', e);
});
textReq.write(JSON.stringify(textPayload));
textReq.end();
