import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "node:fs";
import dotenv from 'dotenv';
import path from 'path';

// Specifically load .env.local
// dotenv.config({ path: '.env.local' });

// Load API key from .env.local manually for this script
const API_KEY = AIzaSyAekjDwabdEWclyJtJaH6Ci8BbzhV-OhNg;

// if (!API_KEY || API_KEY === 'your-gemini-api-key') {
//   console.error("❌ Error: GEMINI_API_KEY is not set in .env.local");
//   process.exit(1);
// }

async function main() {
  console.log("🚀 Initializing Gemini Native Image Generation...");
  const genAI = new GoogleGenerativeAI(API_KEY);

  const prompt = "painterly comic art, gouache and oil, warm lighting, editorial illustration which is about a dad holding its new born child ";

  try {
    // Note: The new unified API uses generateContent for both text and native images
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-image-preview" });

    console.log("🎨 Requesting image from gemini-3.1-flash-image-preview...");
    const result = await model.generateContent(prompt);
    const response = await result.response;

    for (const part of response.candidates[0].content.parts) {
      if (part.text) {
        console.log("📝 AI Text Output:", part.text);
      } else if (part.inlineData) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");
        fs.writeFileSync("gemini-native-image.png", buffer);
        console.log("✅ Image saved successfully as gemini-native-image.png");
      }
    }
  } catch (error) {
    console.error("❌ API Error:", error.message);
    if (error.response) {
      console.error("Detailed Error:", JSON.stringify(error.response, null, 2));
    }
  }
}

main();
