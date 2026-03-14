require('dotenv').config({ path: '.env.local' });
console.log("Key exists:", !!process.env.GEMINI_API_KEY);
