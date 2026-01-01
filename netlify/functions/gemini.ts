
import { GoogleGenAI, Type } from "@google/genai";

export const handler = async (event: any) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const { action, payload } = JSON.parse(event.body);
    // Netlify functions can access environment variables directly
    // Set GEMINI_API_KEY in Netlify dashboard (no VITE_ prefix needed for server-side)
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

    if (action === "generateBulk") {
      // Bulk question generation with schema validation
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: payload.prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    content: { type: Type.STRING },
                    audioScript: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.STRING },
                    mode: { type: Type.STRING },
                    timeLimit: { type: Type.NUMBER },
                    skill: { type: Type.STRING },
                    difficulty: { type: Type.STRING },
                    stage: { type: Type.NUMBER }
                  },
                  required: ["content", "correctAnswer", "mode", "timeLimit", "skill", "difficulty", "stage"]
                }
              }
            }
          }
        }
      });
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: response.text }),
      };
    }

    if (action === "generate") {
      // Simple generation (legacy support)
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: payload.prompt }] }],
        config: {
          responseMimeType: "application/json",
        }
      });
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: response.text }),
      };
    }

    if (action === "evaluate") {
      // Evaluation with multimodal support
      const parts: any[] = [{ text: payload.promptText }];
      if (payload.isMultimodal && payload.inlineData) {
        parts.push({ inlineData: payload.inlineData });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts }],
        config: {
          responseMimeType: "application/json"
        }
      });
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: response.text }),
      };
    }

    return { 
      statusCode: 400, 
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Invalid Action" })
    };
  } catch (error: any) {
    console.error("Server-side Gemini Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
