const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GOOGLE_AI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
  // Versuch mit einem Standard Gemini Modell, das oft Multimodal ist
  // Wir prüfen, ob es Bilder generieren kann (manche Versionen im Jahr 2026 können das vielleicht nativ)
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" });

  const prompt = "Generate an image of a beer bottle label with a hop cone.";

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    console.log("Response Text:", response.text());
    console.log("Candidates:", JSON.stringify(response.candidates, null, 2));
  } catch (e) {
    console.error("Error:", e.message);
  }
}

run();