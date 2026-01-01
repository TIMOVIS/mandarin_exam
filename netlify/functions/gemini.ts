
import { GoogleGenAI } from "@google/genai";

export const handler = async (event: any) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { action, payload } = JSON.parse(event.body);
    // Netlify functions can access environment variables directly
    // Set GEMINI_API_KEY in Netlify dashboard (no VITE_ prefix needed for server-side)
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

    if (action === "generate") {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: payload.prompt }] }],
        config: {
          responseMimeType: "application/json",
        }
      });
      return {
        statusCode: 200,
        body: JSON.stringify({ text: response.text }),
      };
    }

    if (action === "evaluate") {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{
          role: "user",
          parts: [
            { text: payload.promptText },
            ...(payload.isMultimodal ? [{ inlineData: payload.inlineData }] : [])
          ]
        }],
        config: {
          responseMimeType: "application/json"
        }
      });
      return {
        statusCode: 200,
        body: JSON.stringify({ text: response.text }),
      };
    }

    return { statusCode: 400, body: "Invalid Action" };
  } catch (error: any) {
    console.error("Server-side Gemini Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
