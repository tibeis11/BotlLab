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
        console.log("Verfügbare Modelle:");
        const imagenModels = json.models.filter(m => m.name.includes('image'));
        if (imagenModels.length > 0) {
            imagenModels.forEach(m => {
                console.log(`- ${m.name} (${m.supportedGenerationMethods})`);
            });
        } else {
            console.log("Keine Modelle mit 'image' im Namen gefunden.");
            // Print all just in case
             json.models.forEach(m => {
                console.log(`- ${m.name}`);
            });
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
